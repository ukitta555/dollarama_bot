import { ethers } from 'ethers';
// const utils = require('ethers');
const contractAddr = '0xXXXXXXXXXXXXXXXXXXXXXX'; // flash bot contract address
const gasPrice = ethers.parseUnits('10', 'gwei');
const gasLimit = 300000;

const bscScanApiKey = 'XXXXXXXXXXXXXXXX'; // bscscan API key
const bscScanUrl = `https://api.bscscan.com/api?module=stats&action=bnbprice&apikey=${bscScanApiKey}`;
const baseTokenAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" // WBNB

const config = {
  contractAddr: contractAddr,
  logLevel: 'info',
  concurrency: 50,
  minimumProfit: 50, // in USD
  gasPrice: gasPrice,
  gasLimit: gasLimit,
  bscScanUrl: bscScanUrl,
  baseTokenAddress: baseTokenAddress,
};

export default config;
