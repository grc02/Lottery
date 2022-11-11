const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lottery", function () {
    const FEE = 100;
    let lottery, accounts, provider;

    beforeEach(async () => {
        provider = new ethers.providers.JsonRpcProvider();
        const Lottery = await ethers.getContractFactory("Lottery");
        lottery = await Lottery.deploy(FEE);

        accounts = await ethers.getSigners();
    });

    describe("Entrance fee", function () {
        it("sets the entrance fee", async () => {
            const entranceFee = await lottery.getEntranceFee();
            expect(FEE).to.equal(entranceFee);
            console.log(parseInt(entranceFee));
        });
    });

    describe("Lottery entrance", function () {
        it("lets users enter the lottery", async () => {
            await lottery.connect(accounts[1]).enterLottery({ value: FEE + 100 });
            const p1 = await lottery.getPlayer(0);
            expect(p1).to.equal(accounts[1].address);
        });
    });

    describe("Balance", function () {
        it("checks balance of the lottery contract", async () => {
            await lottery.connect(accounts[1]).enterLottery({ value: FEE + 100 });
            const lotteryBalance = await ethers.provider.getBalance(lottery.address);
            expect(lotteryBalance).to.equal(200);
        });
    });
});
