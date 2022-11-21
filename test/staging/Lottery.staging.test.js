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
      });
