const { ethers } = require("hardhat");
const { FEE } = require("../helper-hardhat-config");

main = async () => {
    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy(FEE);
    await lottery.deployed();
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
