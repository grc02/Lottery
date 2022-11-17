const { network, getNamedAccounts, deployments, ethers } = require("hardhat");

const BASE_FEE = "250000000000000000";
const GAS_PRICE_LINK = 1e9;

module.exports = async () => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const args = [BASE_FEE, GAS_PRICE_LINK];

    if (chainId === 31337) {
        log(`Deploying Mocks...`);
        log(`------------------------------`);

        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: network.config.blockConfirmations || 1,
        });

        log(`Mocks deployed...`);
        log(`==============================`);
    }
};

module.exports.tags = ["all", "mocks"];
