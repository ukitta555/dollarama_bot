import { ethers } from 'ethers';
import { readFile } from 'fs/promises';
import fs from 'fs';

const settings = {
  apiKey: "SFozfa9FHxFP5Yawt9gRu9FmFO05csut",
};

const privateKey = "c970217e5878f0f67d6fb48cdec202af63cb8f459961e14e2429c8cb1b5689d9"; // no money to be found here you scoundrel

const contractAbi = JSON.parse(await readFile(new URL("./sushiswap_abi.json", import.meta.url))).result;
const factoryAbi = JSON.parse(await readFile(new URL("./sushiswap_factory_abi.json", import.meta.url))).result;

let getAllPairs = async (factoryAddess, network = "homestead") => {
  const alchemyProvider = new ethers.AlchemyProvider(network, settings.apiKey);
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

let getSushiSwapInfo = async (pairAddress, network = "homestead") => {
  const alchemyProvider = new ethers.AlchemyProvider(network, settings.apiKey);
  const signer = new ethers.Wallet(privateKey, alchemyProvider);
  const sushiSwapContract = new ethers.Contract(pairAddress, contractAbi, signer)

  const token0 = await sushiSwapContract.token0();
  const token1 = await sushiSwapContract.token1();
  const reserves = await sushiSwapContract.getReserves();

  return {
    token0: token0,
    token1: token1,
    reserves: reserves
  }
}

let getAllSushiSwapPairs = async (factoryAddress, network = "homestead") => {
  let pairs = await getAllPairs(factoryAddress, network);
  let pairsInfo = [];
  for (let i = 0; i < pairs.length; i++) {
    let pairInfo = await getSushiSwapInfo(pairs[i], network);
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

export { getSushiSwapInfo }