const { expect, assert } = require("chai");
const { ethers, deployments, network } = require("hardhat");
const { networkConfig, developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery staging tests", function () {
          let lottery, entranceFee, deployer;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              lottery = await ethers.getContract("Lottery", deployer);

              entranceFee = await lottery.getEntranceFee();
          });

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  console.log("Setting up test...");
                  const startingTimeStamp = await lottery.getLastTimeStamp();
                  const accounts = await ethers.getSigners();

                  console.log("Setting up Listener...");
                  await new Promise(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!");
                          try {
                              const latestWinner = await lottery.getLatestWinner();
                              const lotteryState = await lottery.getLotteryState();
                              const winnerEndingBalance = await accounts[0].getBalance();
                              const endingTimeStamp = await lottery.s_lastTimeStamp();

                              await expect(lottery.getPlayer(0)).to.be.reverted;
                              assert.equal(latestWinner.toString(), accounts[1].address);
                              assert.equal(lotteryState, 0);
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(entranceFee).toString()
                              );
                              assert(endingTimeStamp > startingTimeStamp);
                              resolve();
                          } catch (error) {
                              console.log(error);
                              reject(error);
                          }
                      });
                      console.log("Entering Lottery...");
                      const tx = await lottery
                          .connect(accounts[1])
                          .enterLottery({ value: entranceFee });
                      await tx.wait(1);
                      const winnerStartingBalance = await accounts[1].getBalance();
                  });
              });
          });
      });
