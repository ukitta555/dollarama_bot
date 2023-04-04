import { BigNumber } from "ethers";
import config from "../config";
import {IUniswapV2Pair} from "../../typechain";
import BigNumberPrecise from "bignumber.js"
import {
    isBaseTokenSmallerFuncType,
    MatchedPoolReserves,
    OrderedReserves,
    OrderedReservesEnhanced,
    PoolReservesShort
} from "../types";
import { Pool } from "./types";
import { divideBigNums } from "../utils";

export function isBaseTokenSmallerLocalReserves(reserves: Map<string, Pool>): isBaseTokenSmallerFuncType {
    return async (pool0: string, pool1: string) => {
        if (pool0 === pool1) {
            throw Error("Error: same pools!");
        }
        const pool0Reserve = reserves.get(pool0);
        const pool1Reserve = reserves.get(pool1);
        const [pool0_token0, pool0_token1, pool1_token0, pool1_token1]: string[] = [pool0Reserve!.token0Address, pool0Reserve!.token1Address,
                                                                                    pool1Reserve!.token0Address, pool1Reserve!.token1Address]

        if (
            BigNumber.from(pool0_token0).gte(BigNumber.from(pool0_token1))
            ||
            BigNumber.from(pool1_token0).gte(BigNumber.from(pool1_token1))
        ) {
            throw new Error("Error: non-standard AMM pair!");
        }

        if (BigNumber.from(pool0_token0).eq(BigNumber.from(pool0_token1))) {
            throw new Error("Error: same token pair!");
        }

        if (
            !BigNumber.from(pool0_token0).eq(config.baseTokenAddress)
            &&
            !BigNumber.from(pool0_token1).eq(config.baseTokenAddress)
        ) {
            throw new Error("Error: no base token in LP pair!")
        }

        const isBaseTokenSmaller = BigNumber.from(pool0_token0).eq(config.baseTokenAddress)

        return isBaseTokenSmaller ? {
            isBaseTokenSmaller,
            baseToken: pool0_token0,
            quoteToken: pool0_token1,
        } : {
            isBaseTokenSmaller,
            baseToken: pool0_token1,
            quoteToken: pool0_token0,
        };
    }
}

export function getOrderedReservesLocalReserves(reserves: Map<string, Pool>): (
    pool0: string,
    pool1: string,
    isBaseTokenSmaller: boolean
) => Promise<OrderedReservesEnhanced> {
    return async (pool0: string, pool1: string, isBaseTokenSmaller: boolean) => {
        const pool0Reserve = reserves.get(pool0);
        const pool1Reserve = reserves.get(pool1);

        let [tmpReservesPool0, tmpReservesPool1]: PoolReservesShort[] = [
            {
                _reserve0: pool0Reserve!.reserve0,
                _reserve1: pool0Reserve!.reserve1
            },
            {
                _reserve0: pool1Reserve!.reserve0,
                _reserve1: pool1Reserve!.reserve1
            }]

        let reservesPool0: MatchedPoolReserves;
        let reservesPool1: MatchedPoolReserves;

        if (isBaseTokenSmaller) {
            reservesPool0 = {
                baseTokenReserves: tmpReservesPool0._reserve0,
                quoteTokenReserves: tmpReservesPool0._reserve1
            };
            reservesPool1 = {
                baseTokenReserves: tmpReservesPool1._reserve0,
                quoteTokenReserves: tmpReservesPool1._reserve1
            }
        } else {
            reservesPool0 = {
                baseTokenReserves: tmpReservesPool0._reserve1,
                quoteTokenReserves: tmpReservesPool0._reserve0
            };
            reservesPool1 = {
                baseTokenReserves: tmpReservesPool1._reserve1,
                quoteTokenReserves: tmpReservesPool1._reserve0
            }
        }
        console.log(`Reserves0: ${reservesPool0.baseTokenReserves}, ${reservesPool0.quoteTokenReserves}`)
        console.log(`Reserves1: ${reservesPool1.baseTokenReserves}, ${reservesPool1.quoteTokenReserves}`)

        // probably a bug in smart contract - Solidity does not support precise division of uint's,
        // so there was a possibility that params were not calculated correctly
        // possibly can include this in the report...
        const pricePool0: BigNumberPrecise = divideBigNums(
            reservesPool0.baseTokenReserves,
            reservesPool0.quoteTokenReserves,
        )
        const pricePool1: BigNumberPrecise = divideBigNums(
            reservesPool1.baseTokenReserves,
            reservesPool1.quoteTokenReserves,
        )

        console.log(`Prices: ${pricePool0}, ${pricePool1}`)

        let lowerPricePool;
        let higherPricePool;
        let lowerPricePoolReserves: MatchedPoolReserves;
        let higherPricePoolReserves: MatchedPoolReserves;

        if (pricePool0.lt(pricePool1)) {
            lowerPricePool = pool0
            higherPricePool = pool1
            lowerPricePoolReserves = reservesPool0
            higherPricePoolReserves = reservesPool1
        } else {
            lowerPricePool = pool1
            higherPricePool = pool0
            lowerPricePoolReserves = reservesPool1
            higherPricePoolReserves = reservesPool0
        }

        let orderedReserves: OrderedReserves = {
            lowerPricePoolBaseToken: lowerPricePoolReserves.baseTokenReserves,
            lowerPricePoolQuoteToken: lowerPricePoolReserves.quoteTokenReserves,
            higherPricePoolBaseToken: higherPricePoolReserves.baseTokenReserves,
            higherPricePoolQuoteToken: higherPricePoolReserves.quoteTokenReserves,
        }

        return {
            lowerPricePool,
            higherPricePool,
            orderedReserves
        }
    }
}