const { expect, assert } = require("chai");
const { ethers, getNamedAccounts, deployments, network } = require("hardhat");
const { networkConfig } = require("../../helper-hardhat-config");

describe("Lottery", function () {
    let lottery,
        mockCoordinator,
        entranceFee,
        interval,
        lotteryState /*, deployer, player1, player2*/;

    beforeEach(async () => {
        await deployments.fixture(["all"]);
        const Lottery = await deployments.get("Lottery");
        lottery = await ethers.getContractAt(Lottery.abi, Lottery.address);
        mockCoordinator = await ethers.getContract("VRFCoordinatorV2Mock");

        entranceFee = await lottery.getEntranceFee();
        interval = await lottery.getInterval();
        lotteryState = await lottery.getLotteryState();
    });

    describe("constructor", function () {
        it("initializes the lottery correctly", async () => {
            expect(interval.toString()).to.be.equal(
                networkConfig[network.config.chainId]["keepersUpdateInterval"]
            );
            let _entranceFee = networkConfig[network.config.chainId]["entranceFee"].toString();
            assert(entranceFee, _entranceFee);
            expect(lotteryState.toString()).to.be.equal("0");
        });
    });
});
