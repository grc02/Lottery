const { expect, assert } = require("chai");
const { ethers, getNamedAccounts, deployments, network } = require("hardhat");
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
                  const response = await lottery.callStatic.checkUpkeep("0x");
                  expect(response[0]).to.be.equal(false);
                  assert.equal(response[1], "0x");
              });
          });
      });
