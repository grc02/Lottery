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
                  await expect(lottery.callStatic.checkUpkeep("0x")).to.be.revertedWith(
                      "Lottery__NotEnoughETH"
                  );
              });

              it("returns false if lottery is not in an open state", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  await lottery.performUpkeep([]);
                  lotteryState = await lottery.getLotteryState();
                  await expect(lottery.callStatic.checkUpkeep([])).to.be.revertedWith(
                      "Lottery__NotOpen"
                  );
                  assert.equal(lotteryState.toString(), "1");
              });

              it("returns false if enough time hasn't passed", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() - interval / 2,
                  ]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  await expect(lottery.callStatic.checkUpkeep("0x")).to.be.revertedWith(
                      "Lottery__NotEnoughTimePassed"
                  );
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
      });
