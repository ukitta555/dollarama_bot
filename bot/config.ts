import { BigNumber, BigNumberish, utils } from 'ethers';

interface Config {
  contractAddr: string;
  logLevel: string;
  minimumProfit: number;
  gasPrice: BigNumber;
  gasLimit: BigNumberish;
  bscScanUrl: string;
  concurrency: number;
  baseTokenAddress: string;
}

const contractAddr = '0xdE7E16ffAac1AB6cF39DAE5e65a10d694080b3Bb'; // flash bot contract address
const gasPrice = utils.parseUnits('25', 'gwei');
const gasLimit = 300000;

const bscScanApiKey = 'XXXXXXXXXXXXXXXX'; // bscscan API key
const bscScanUrl = `https://api.bscscan.com/api?module=stats&action=bnbprice&apikey=${bscScanApiKey}`;
const baseTokenAddress = "0x1869686c24b3B525A66bDa0866Ab5773B75BdF8a"
// const baseTokenAddress = "0x3d289e88330abf26ca555425be12df4c9fa76508"

const config: Config = {
  contractAddr: contractAddr,
  logLevel: 'debug',
  concurrency: 50,
  minimumProfit: 0, // in USD
  gasPrice: gasPrice,
  gasLimit: gasLimit,
  bscScanUrl: bscScanUrl,
  baseTokenAddress: baseTokenAddress,
};

export default config;
