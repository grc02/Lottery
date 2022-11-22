const { expect, assert } = require("chai");
const { ethers, deployments, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery unit tests", function () {
          let lottery, mockCoordinator, entranceFee, interval, lotteryState, accounts;
          chainId = network.config.chainId;

          beforeEach(async () => {
              await deployments.fixture(["all"]);
              const Lottery = await deployments.get("Lottery");
              lottery = await ethers.getContractAt(Lottery.abi, Lottery.address);
              mockCoordinator = await ethers.getContract("VRFCoordinatorV2Mock");

              entranceFee = await lottery.getEntranceFee();
              interval = await lottery.getInterval();
              lotteryState = await lottery.getLotteryState();
              accounts = await ethers.getSigners();
          });

          describe("constructor", function () {
              it("initializes the lottery correctly", async () => {
                  expect(interval.toString()).to.be.equal(
                      networkConfig[chainId]["keepersUpdateInterval"]
                  );
                  let _entranceFee = networkConfig[chainId]["entranceFee"].toString();
                  assert.equal(entranceFee, _entranceFee);
                  expect(lotteryState.toString()).to.be.equal("0");
              });
          });

          describe("enterLottery", function () {
              it("sends insufficient amount of funds", async () => {
                  await expect(lottery.enterLottery()).to.be.revertedWith("Lottery__NotEnoughETH");
              });

              it("records participant when they enter", async () => {
                  await lottery.connect(accounts[1]).enterLottery({ value: entranceFee });
                  const participant = await lottery.getParticipant(0);
                  assert.equal(accounts[1].address, participant);
              });

              it("emits an event when a participant enters", async () => {
                  await expect(lottery.enterLottery({ value: entranceFee })).to.emit(
                      lottery,
                      "LotteryEntered"
                  );
              });

              it("doesn't allow entrance when lottery has calculating state", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  await lottery.performUpkeep([]);
                  await expect(lottery.enterLottery({ value: entranceFee })).to.be.revertedWith(
                      "Lottery__NotOpen"
                  );
              });
          });

          describe("checkUpkeep", function () {
              it("returns false if people haven't sent any ETH", async () => {
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
                  assert(!upkeepNeeded);
              });

              it("returns false if lottery is not in an open state", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  await lottery.performUpkeep([]);
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
                  lotteryState = await lottery.getLotteryState();
                  assert.equal(lotteryState.toString(), "1", upkeepNeeded === false);
              });

              it("returns false if enough time hasn't passed", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() - interval / 2,
                  ]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
                  expect(upkeepNeeded).to.be.equal(false);
              });

              it("returns true if all conditions are met", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + interval / 2,
                  ]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const upkeepCalled = await lottery.callStatic.checkUpkeep([]);
                  assert(upkeepCalled);
              });
          });

          describe("performUpkeep", function () {
              it("throws an error when not all conditions are met", async () => {
                  await expect(lottery.performUpkeep([])).to.be.revertedWith(
                      `Lottery__checkUpkeepNotPassed`
                  );
              });

              it("can only run if checkupkeep is true", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const tx = await lottery.performUpkeep("0x");
                  assert(tx);
              });

              it("changes the state of the lottery from open to calculating", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const tx = await lottery.performUpkeep("0x");
                  lotteryState = await lottery.getLotteryState();
                  assert.equal(lotteryState.toString(), "1");
              });

              it("emits an event with a requestId as param", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const txResponse = await lottery.performUpkeep("0x");
                  const txReceipt = await txResponse.wait(1);
                  const requestId = txReceipt.events[1].args.requestId;
                  expect(requestId > 0);
              });
          });

          describe("fulfillRandomWords", function () {
              beforeEach(async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
              });
              it("can only be called after performupkeep", async () => {
                  await expect(
                      mockCoordinator.fulfillRandomWords(0, lottery.address)
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      mockCoordinator.fulfillRandomWords(1, lottery.address)
                  ).to.be.revertedWith("nonexistent request");
              });

              it("picks a winner, resets, and sends money", async () => {
                  const additionalEntrances = 3;
                  const startingIndex = 2;
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      await lottery.connect(accounts[i]).enterLottery({ value: entranceFee });
                  }
                  const startingTimeStamp = await lottery.s_lastTimeStamp();

                  await new Promise(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!");
                          try {
                              const recentWinner = await lottery.getLatestWinner();
                              lotteryState = await lottery.getLotteryState();
                              const winnerBalance = await accounts[2].getBalance();
                              const endingTimeStamp = await lottery.s_lastTimeStamp();
                              const finalBalance = startingBalance
                                  .add(entranceFee.mul(additionalEntrances + 1))
                                  .toString();
                              const numberOfParticipants = await lottery.getNumberOfParticipants();
                              await expect(lottery.getParticipant(0)).to.be.reverted;
                              assert.equal(recentWinner.toString(), accounts[2].address);
                              assert.equal(lotteryState, 0);
                              assert.equal(winnerBalance.toString(), finalBalance);
                              assert(endingTimeStamp > startingTimeStamp);
                              assert.equal(numberOfParticipants, 0);
                              resolve();
                          } catch (error) {
                              reject(error);
                          }
                      });
                      const tx = await lottery.performUpkeep("0x");
                      const txReceipt = await tx.wait(1);
                      const startingBalance = await accounts[2].getBalance();
                      await mockCoordinator.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          lottery.address
                      );
                  });
              });
          });
      });
