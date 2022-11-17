const { network, getNamedAccounts, deployments } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { deploy, log } = deployments;
const chainId = network.config.chainId;

function getArgs() {
    entranceFee = networkConfig[chainId]["entranceFee"];
    gasLane = networkConfig[chainId]["gasLane"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
    callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
    keepersUpdateInterval = networkConfig[chainId]["keepersUpdateInterval"];
    return [entranceFee, gasLane, subscriptionId, callbackGasLimit, keepersUpdateInterval];
}

module.exports = async () => {
    const { deployer } = await getNamedAccounts();

    log(`Deploying Lottery...`);
    log(`------------------------------`);

    let mockAddress;
    if (developmentChains.includes(network.name) && chainId === 31337) {
        const mockContract = await deployments.get("VRFCoordinatorV2Mock");
        mockAddress = mockContract.address;
    } else {
        mockAddress = networkConfig[chainId]["vrfCoordinatorV2"];
    }

    let entranceFee = networkConfig[chainId]["entranceFee"];
    let gasLane = networkConfig[chainId]["gasLane"];
    let subscriptionId = networkConfig[chainId]["subscriptionId"];
    let callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
    let keepersUpdateInterval = networkConfig[chainId]["keepersUpdateInterval"];

    const args = [
        mockAddress,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        keepersUpdateInterval,
    ];

    await deploy("Lottery", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
};
