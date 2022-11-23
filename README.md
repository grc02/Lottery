# Lottery Contract

## Table of Contents

- [About The Project](#about-the-project)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Deployment to a testet](#deployment-to-a-testet)
- [Verify on etherscan](#verify-on-etherscan)

## About The Project

This is an advanced Lottery Smart Contract, which uses Chainlink Automation for automatically kicking off Chainlink VRF to generate a random winner after a given time interval has passed. It allows for a dynamic subscription of Chainlink Keepers Upkeep and Chainlink VRF.

### Built With

- ![Solidity]
- ![Ethers]
- ![Hardhat]
- ![Chainlink]

## Getting Started

### Prerequisites

- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
  - You'll know you did it right if you can run `git --version` and you see a response like `git version x.x.x`
- [Nodejs](https://nodejs.org/en/)
  - You'll know you've installed nodejs right if you can run:
    - `node --version` and get an ouput like: `x.x.x`
- [Yarn](https://yarnpkg.com/getting-started/install) instead of `npm`
  - You'll know you've installed yarn right if you can run:
    - `yarn --version` and get an output like: `x.x.x`
    - You might need to [install it with `npm`](https://classic.yarnpkg.com/lang/en/docs/install/) or `corepack`

### Installation

1. Clone the repo

   ```
   git clone https://github.com/grc02/Lottery.git
   ```

2. Change the current working directory

   ```
   cd Lottery
   ```

3. Install yarn packages
   ```
   yarn install
   ```

## Usage

**Deploy:**

```
yarn hardhat deploy
```

**Testing:**

```
yarn hardhat test
```

**Test Coverage:**

```
yarn hardhat coverage
```

## Deployment to a testet

**1. Setup environment variabltes**

You'll want to set your `GOERLI_RPC_URL` and `PRIVATE_KEY` as environment variables. You can add them to a `.env` file.

- `PRIVATE_KEY`: The private key of your account (like from [metamask](https://metamask.io/)).
- `GOERLI_RPC_URL`: This is url of the goerli testnet node you're working with. You can get setup with one for free from [Alchemy](https://alchemy.com/)

**2. Get testnet ETH and LINK**

Head over to [faucets.chain.link](https://faucets.chain.link/) and get some tesnet ETH & LINK. You should see the ETH and LINK show up in your metamask.

**3. Deploy to goerli testnet**

Now you can run:

```
yarn hardhat deploy --network goerli
```

**NOTE:** You don't need to setup a Chainlink VRF Subscription and Chainlink Keepers Upkeep.
This will be automatically done when you deploy the contract. Your Upkeep will be funded with 5 LINK and VRF subscription with 2 LINK. You can fund with different amount by changing value of `fundUpkeepAmount` and `fundVRFAmount` in your `helper-hardhat-config.js`.

**4. Enter the lottery**

Your contract is now setup and you can enter the lottery by running:

```
yarn hardhat run scripts/enterLottery.js --network goerli
```

## Verify on etherscan

If you deploy to a testnet or mainnet, you can verify it if you get an [API Key](https://etherscan.io/myapikey) from Etherscan and set it as an environemnt variable named `ETHERSCAN_API_KEY`. You can add it into your `.env` file.

In it's current state, if you have your api key set, it will auto verify goerli contracts.

However, you can manual verify with:

```
yarn hardhat verify --network goerli --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS
```

Check out [hardhat-etherscan](https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-etherscan) for reference.