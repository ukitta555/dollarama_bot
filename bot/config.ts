import { BigNumber, BigNumberish, utils } from 'ethers';

interface Config {
  contractAddr: string;
  logLevel: string;
  minimumProfit: number;
  gasPrice: BigNumber;
  gasLimit: BigNumberish;
  ethScanUrl: string;
  concurrency: number;
  baseTokenAddress: string;
}

const contractAddr = '0xd406089023668AeEB9D76004B362f60a696c3AB4'; // flash bot contract address
const gasPrice = utils.parseUnits('115', 'gwei');
const gasLimit = 300000;

const bscScanApiKey = '4381HPFM4FSM46R2X6JFUDZV6S9SS6HXDC'; // bscscan API key
const bscScanUrl = `https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${bscScanApiKey}`;
const baseTokenAddress = "0xcaF30Af12f5BFb687a50eCeDcC308170DF653F1f"
// const baseTokenAddress = "0x3d289e88330abf26ca555425be12df4c9fa76508"

const config: Config = {
  contractAddr: contractAddr,
  logLevel: 'debug',
  concurrency: 50,
  minimumProfit: 0.1, // in USD
  gasPrice: gasPrice,
  gasLimit: gasLimit,
  ethScanUrl: bscScanUrl,
  baseTokenAddress: baseTokenAddress,
};

export default config;
