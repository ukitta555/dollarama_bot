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

export class ChainReader {
  private _alchemyProvider: ethers.providers.AlchemyProvider;
  private _signer: ethers.Wallet;

  constructor (network: string) {
    this._alchemyProvider = new ethers.providers.AlchemyProvider(network, settings.apiKey);
    this._signer = new ethers.Wallet(privateKey, this._alchemyProvider);
  }

  async getAllPairs (factoryAddess: string) {
    const sushiSwapFactoryContract = new ethers.Contract(factoryAddess, factoryAbi, this._signer)
  
    const allPairsLength = await sushiSwapFactoryContract.allPairsLength();
    let allPairs = [];
    for (let i = 0; i < allPairsLength; i++) {
      console.log(i);
      allPairs.push(await sushiSwapFactoryContract.allPairs(i));
    }
    return allPairs;
  }

  async getInfoFromUniswapBasedContract(pairAddress: string): Promise<Pool> {
    const uniSwapBasedContract = new ethers.Contract(pairAddress, contractAbi, this._signer)
  
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

  async registerBlockCallback (callback: (blockNumber: number) => Promise<void>) {
    this._alchemyProvider.on("block", async (blockNumber) => {
      await callback(blockNumber);
    })
  }

  async getAllPairsAndInfo (factoryAddress: string, outputFile: string) {
    let pairs = await this.getAllPairs(factoryAddress);
    let pairsInfo = [];
    for (let i = 0; i < pairs.length; i++) {
      let pairInfo = await this.getInfoFromUniswapBasedContract(pairs[i]);
      pairsInfo.push(pairInfo);
      console.log(pairInfo)
    }

    fs.writeFileSync(outputFile, JSON.stringify(pairsInfo, null, 2))
    return pairsInfo;
  }
}


// let sushiFactoryMain = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac"
// let sushiFactoryGoerli = "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"
// console.log(await getAllSushiSwapPairs(sushiFactoryGoerli, "goerli"))
