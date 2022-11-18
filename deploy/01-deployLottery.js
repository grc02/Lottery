const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const FUND_AMOUNT = ethers.utils.parseEther("5");

module.exports = async () => {
    const { deployer } = await getNamedAccounts();
    const { deploy, log } = deployments;
    const chainId = network.config.chainId;

    log(`Deploying Lottery...`);
    log(`------------------------------`);

    let mockAddress, subscriptionId, mockContract;
    if (developmentChains.includes(network.name) && chainId === 31337) {
        mockContract = await ethers.getContract("VRFCoordinatorV2Mock");
        mockAddress = mockContract.address;
        const txResponse = await mockContract.createSubscription();
        const txReceipt = await txResponse.wait();
        subscriptionId = txReceipt.events[0].args.subId;
        await mockContract.fundSubscription(subscriptionId, FUND_AMOUNT);
    } else {
        mockAddress = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId]["subscriptionId"];
    }

    let entranceFee = networkConfig[chainId]["entranceFee"];
    let gasLane = networkConfig[chainId]["gasLane"];
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

    const lottery = await deploy("Lottery", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (developmentChains.includes(network.name) && chainId === 31337) {
        await mockContract.addConsumer(subscriptionId.toNumber(), lottery.address);
    }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...");
        await verify(lottery.address, arguments);
    }
};

module.exports.tags = ["all", "lottery"];
