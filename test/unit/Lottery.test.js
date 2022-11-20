const { expect, assert } = require("chai");
const { ethers, deployments, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", function () {
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

              it("records player when they enter", async () => {
                  await lottery.connect(accounts[1]).enterLottery({ value: entranceFee });
                  const player = await lottery.getPlayer(0);
                  assert.equal(accounts[1].address, player);
              });

              it("emits an event when a player enters", async () => {
                  await expect(lottery.enterLottery({ value: entranceFee })).to.emit(
                      lottery,
                      "lotteryEntered"
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
                  const requestId = txReceipt.events[1].args.requestedId;
                  expect(requestId > 0);
              });
          });

          describe("fulfillRandomWords", function () {
              beforeEach(async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
              });
          });
      });
