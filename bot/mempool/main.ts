import { getInfoFromUniswapBasedContract } from "./getInfoFromUniswapBasedContract"
import { Pool, ReserveUpdate } from "./types";
import { watchAddress } from "./watchAddress";
import { arbitrageFunc } from "../arbitrageEntryPoint"
import { isBaseTokenSmallerLocalReserves, getOrderedReservesLocalReserves } from "./utils";
import { getTokens, Network, tryLoadPairs } from "../tokens";
import config from "../config";
import { ethers } from "hardhat";
import {FlashBotDev} from "../../typechain";
import log from "../log";
import {ArbitrageLock} from "../lock";
const ArrayKeyedMap = require("array-keyed-map");

const arbitrageLock: ArbitrageLock = new ArbitrageLock();

const WatchCallback = async (
    reserves: Map<string, Pool>,
    tokensToPairs: Map<string[], Pool[]>,
    changes: ReserveUpdate,
    pool_address: string,
    flashBot: FlashBotDev,
    baseTokens: Tokens
) => {
  console.log(`Dealing with pool ${pool_address}`);
  let pool = reserves.get(pool_address);
  if (pool == undefined) {
    console.log(`Pool ${pool_address} is undefined in map, do nothing!`)
    return -1
  }
  console.log(`Reserve0 before update: ${pool.reserve0.toString()}`);
  console.log(`Reserve1 before update: ${pool.reserve1.toString()}`)
  pool.reserve0 = pool.reserve0.add(changes.reserve0Delta);
  pool.reserve1 = pool.reserve1.add(changes.reserve1Delta);
  console.log(`Reserve0 after update: ${pool.reserve0.toString()}`);
  console.log(`Reserve1 after update: ${pool.reserve1.toString()}`)

  let tokensSorted = [pool.token0Address, pool.token1Address];
  tokensSorted.sort()

  log.debug(`Is arbitraged locked: ${arbitrageLock.locked}`)
  for (const other_pool of tokensToPairs.get(tokensSorted)!) {
    if (other_pool.address != pool.address && !arbitrageLock.locked) {
        arbitrageLock.locked = true
        // Call aribtrageFunc using current reserves
        await arbitrageFunc(
            flashBot,
            baseTokens,
            isBaseTokenSmallerLocalReserves(reserves),
            getOrderedReservesLocalReserves(reserves),
            {
              symbols: "RND_PAIR",
              pairs: [pool.address.toLowerCase(), other_pool.address.toLowerCase()],
            }
        );
        arbitrageLock.locked = false
    }
  }
}

let main = async (pool_addresses: string[], network = "homestead") => {
  const pairs = await tryLoadPairs(Network.ETH_TESTNET);
  const flashBot = (await ethers.getContractAt('FlashBotDev', config.contractAddr)) as FlashBotDev;
  const [baseTokens] = getTokens(Network.ETH_TESTNET);
  
  let reservesMap: Map<string, Pool> = new Map()
  let tokensToPairs: Map<string[], Pool[]> = new ArrayKeyedMap()

  for (const pool_address of pool_addresses) {
    let pool = await getInfoFromUniswapBasedContract(pool_address, network);
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

main([
    '0xd6C41618DBcb698938da6B46e8B61034773A5467'.toLowerCase(),
    '0xd5374e67A8670c3133fB368E7e5bdC4000547260'.toLowerCase()
], 'goerli')