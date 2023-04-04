import { ethers } from 'ethers';
import fs from 'fs';
import { Pool } from './types';
import { PoolReservesShort } from '../types';

const settings = {
  apiKey: "SFozfa9FHxFP5Yawt9gRu9FmFO05csut",
};

const privateKey = "c970217e5878f0f67d6fb48cdec202af63cb8f459961e14e2429c8cb1b5689d9"; // no money to be found here you scoundrel

const contractAbi = JSON.parse(fs.readFileSync(`${__dirname}/sushiswap_abi.json`)).result;
const factoryAbi = JSON.parse(fs.readFileSync(`${__dirname}/sushiswap_factory_abi.json`)).result;

let getAllPairs = async (factoryAddess: string, network : string = "homestead") => {
  const alchemyProvider = new ethers.providers.AlchemyProvider(network, settings.apiKey);
  const signer = new ethers.Wallet(privateKey, alchemyProvider);
  const sushiSwapFactoryContract = new ethers.Contract(factoryAddess, factoryAbi, signer)

  const allPairsLength = await sushiSwapFactoryContract.allPairsLength();
  let allPairs = [];
  for (let i = 0; i < allPairsLength; i++) {
    console.log(i);
    allPairs.push(await sushiSwapFactoryContract.allPairs(i));
  }
  return allPairs;
}

export let getInfoFromUniswapBasedContract = async (pairAddress: string, network = "homestead"): Promise<Pool> => {
  const alchemyProvider = new ethers.providers.AlchemyProvider(network, settings.apiKey);
  const signer = new ethers.Wallet(privateKey, alchemyProvider);
  const uniSwapBasedContract = new ethers.Contract(pairAddress, contractAbi, signer)

  const token0 = await uniSwapBasedContract.token0();
  const token1 = await uniSwapBasedContract.token1();
  const reserves = (await uniSwapBasedContract.getReserves()) as PoolReservesShort;

  return {
    address: pairAddress,
    token0Address: token0.toLowerCase(),
    token1Address: token1.toLowerCase(),
    reserve0: reserves._reserve0,
    reserve1: reserves._reserve1
  }
}

let getAllSushiSwapPairs = async (factoryAddress: string, network = "homestead") => {
  let pairs = await getAllPairs(factoryAddress, network);
  let pairsInfo = [];
  for (let i = 0; i < pairs.length; i++) {
    let pairInfo = await getInfoFromUniswapBasedContract(pairs[i], network);
    pairsInfo.push(pairInfo);
    console.log(pairInfo)
  }
  // write to "main_pairs.json"
  fs.writeFileSync("main_pairs.json", JSON.stringify(pairsInfo, null, 2))
  return pairsInfo;
}

// let sushiFactoryMain = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac"
// let sushiFactoryGoerli = "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"
// console.log(await getAllSushiSwapPairs(sushiFactoryGoerli, "goerli"))
