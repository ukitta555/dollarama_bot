import { task, HardhatUserConfig } from 'hardhat/config';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-waffle';
import "hardhat-gas-reporter";

import 'solidity-coverage'
import deployer from './.secret';

const BSC_RPC = 'https://wider-omniscient-forest.bsc.discover.quiknode.pro/ad2953eb92cef2ef0a576ee02eceea96ed5e1942/'
const ETH_GOERLI_RPC = 'https://eth-goerli.g.alchemy.com/v2/o9kpx9zHcF3Dk97O3TA34fhvh9vk_FKQ'

// Goerli UniswapV2 factory:
// https://goerli.etherscan.io/address/0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f#readContract
const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.7',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      // loggingEnabled: true,
      forking: {
        url: ETH_GOERLI_RPC,
        enabled: true,
        blockNumber: 8757745
      },
      accounts: {
        accountsBalance: '1000000000000000000000000', // 1 mil ether
      },

    },
    goerli: {
      allowUnlimitedContractSize: true,
      url: ETH_GOERLI_RPC,
      accounts: [deployer.private],
      forking: {
        url: ETH_GOERLI_RPC,
        enabled: true,
        blockNumber: 8757745,
      }
    }
  },
  mocha: {
    timeout: 40000,
  },
  gasReporter: {
    currency: 'CAD',
    outputFile: 'test.txt',
    noColors: true,
    coinmarketcap: "bc78d32a-76e5-4ba8-8441-ab42d2f9bebd",
    token: "BNB",
  }
};

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = config;
