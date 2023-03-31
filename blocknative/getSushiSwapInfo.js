import { ethers } from 'ethers';
import { readFile } from 'fs/promises';

const settings = {
  apiKey: "SFozfa9FHxFP5Yawt9gRu9FmFO05csut",
};

const privateKey = "c970217e5878f0f67d6fb48cdec202af63cb8f459961e14e2429c8cb1b5689d9"; // no money to be found here you scoundrel

const contractAbi = JSON.parse(await readFile(new URL("./sushiswap_abi.json", import.meta.url))).result;

let getSushiSwapInfo = async (pairAddress) => {
  const alchemyProvider = new ethers.AlchemyProvider("homestead", settings.apiKey); //"maticmum" for Mumbai testnet
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

export { getSushiSwapInfo };