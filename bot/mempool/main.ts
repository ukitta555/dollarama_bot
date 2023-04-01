import { BigNumber } from "ethers";
import { getSushiSwapInfo } from "./getSushiSwapInfo"
import { Pool, ReserveUpdate } from "./types";
import { watchAddress } from "./watchAddress";
import { arbitrageFunc } from "../index"
import { isBaseTokenSmallerLocalReserves, getOrderedReservesLocalReserves } from "./utils";
import { FlashBot } from '../../typechain/FlashBot';
import { getTokens, Network, tryLoadPairs } from "../tokens";
import config from "../config";
import { ethers } from "hardhat";

const WatchCallback = (reserves: Map<string, Pool>, tokensToPairs: Map<string[], Pool[]>, changes: ReserveUpdate, pool_address: string,
                       flashBot: FlashBot, baseTokens: Tokens) => {
  let pool = reserves.get(pool_address);
  if (pool == undefined) {
    return -1
  }
  pool.reserve0 = pool.reserve0.add(changes.reserve0Delta);
  pool.reserve1 = pool.reserve1.add(changes.reserve1Delta);

  let tokensSorted = [pool.token0Address, pool.token1Address];
  tokensSorted.sort()
  
  for (const other_pool of tokensToPairs.get(tokensSorted)!) {
    if (other_pool.address != pool.address) {
      // Call aribtrageFunc using current reserves
      arbitrageFunc(flashBot, baseTokens, isBaseTokenSmallerLocalReserves(reserves), getOrderedReservesLocalReserves(reserves))
    }
  }
}

let main = async (pool_addresses: string[], network = "homestead") => {
  const pairs = await tryLoadPairs(Network.BSC);
  const flashBot = (await ethers.getContractAt('FlashBot', config.contractAddr)) as FlashBot;
  const [baseTokens] = getTokens(Network.BSC);
  
  let reservesMap: Map<string, Pool> = new Map()
  let tokensToPairs = new Map<string[], Pool[]>()

  for (const pool_address of pool_addresses) {
    let pool = await getSushiSwapInfo(pool_address, network);
    reservesMap.set(pool_address, {
      address: pool_address,
      token0Address: pool.token0Address,
      token1Address: pool.token1Address,
      reserve0: pool.reserve0,
      reserve1: pool.reserve1
    })

    watchAddress(pool, (reserveChanges, address) => {
      WatchCallback(reservesMap, tokensToPairs, reserveChanges, address, flashBot, baseTokens)
    }, network)

    let tokensSorted = [pool.token0Address, pool.token1Address]
    tokensSorted.sort()
    if (tokensToPairs.has(tokensSorted)) {
      tokensToPairs.get(tokensSorted)!.push(pool)
    } else {
      tokensToPairs.set(tokensSorted, [pool])
    }
  }
}

main(['0xd326C8610490Fdb448e24487D42f3cD2C38CB1b5'], 'goerli')