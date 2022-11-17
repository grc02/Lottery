require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

const GOERLI_PRC_URL = process.env.GOERLI_PRC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
        },
        goerli: {
            chainId: 5,
            url: GOERLI_PRC_URL,
            accounts: [PRIVATE_KEY],
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.8.17",
            },
        ],
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player1: {
            default: 1,
        },
        player2: {
            default: 2,
        },
    },
};
