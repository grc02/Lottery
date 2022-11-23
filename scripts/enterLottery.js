const { ethers } = require("hardhat");

async function enterLottery() {
    const lottery = await ethers.getContract("Lottery");
    const entranceFee = await lottery.getEntranceFee();
    const tx = await lottery.enterLottery({ value: entranceFee });
    await tx.wait(1);
    console.log("Lottery Entered!");
}

enterLottery()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
