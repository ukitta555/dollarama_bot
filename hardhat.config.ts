import { task, HardhatUserConfig } from 'hardhat/config';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-waffle';
import 'solidity-coverage'
// import deployer from './.secret';

// const BSC_RPC = 'https://bsc-dataseed.binance.org/';
// const BSC_RPC = 'https://bsc-dataseed1.defibit.io/';
// const BSC_RPC = 'https://bsc.getblock.io/ab08db7c-9c49-48a9-bc8c-21744655788e/mainnet/'
const BSC_RPC = 'https://wider-omniscient-forest.bsc.discover.quiknode.pro/ad2953eb92cef2ef0a576ee02eceea96ed5e1942/'
const BSC_Tetsnet_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';

const config: HardhatUserConfig = {
  solidity: { version: '0.7.6' },
  networks: {
    hardhat: {
      // loggingEnabled: true,
      forking: {
        url: BSC_RPC,
        enabled: true,
        blockNumber: 26646850
      },
      accounts: {
        accountsBalance: '1000000000000000000000000', // 1 mil ether
      },
    },
    // bscTestnet: {
    //   url: BSC_Tetsnet_RPC,
    //   chainId: 0x61,
    //   accounts: [deployer.private],
    // },
    // bsc: {
    //   url: BSC_RPC,
    //   chainId: 0x38,
    //   accounts: [deployer.private],
    // },
   },
  mocha: {
    timeout: 40000,
  },
};

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = config;
