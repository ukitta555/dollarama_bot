import {BigNumber} from "ethers";
import BigNumberPrecise from "bignumber.js"
import {ethers} from "hardhat";
import {IUniswapV2Pair} from "../typechain";
import config from "./config";
import {MatchedPoolReserves, OrderedReserves, OrderedReservesEnhanced, PoolReservesShort} from "./types";

export function divideBigNums(x: BigNumber, y: BigNumber): BigNumberPrecise {
    BigNumberPrecise.set({ DECIMAL_PLACES: 20 })

    const xPrecise = BigNumberPrecise(x.toString())
    const yPrecise = BigNumberPrecise(y.toString())
    // console.log(`Precise: ${xPrecise} ${yPrecise}`)
    // console.log(`Division: ${xPrecise.div(yPrecise)}`)
    return xPrecise.div(yPrecise)

} // copy from UniswapV2Library
export async function isBaseTokenSmallerWeb3(pool0: string, pool1: string): Promise<{
    isBaseTokenSmaller: boolean,
    baseToken: string,
    quoteToken: string
}> {
    if (pool0 === pool1) {
        throw Error("Error: same pools!");
    }
    const uniswapV2PairPool0 = (await ethers.getContractAt('IUniswapV2Pair', pool0)) as IUniswapV2Pair;
    const uniswapV2PairPool1 = (await ethers.getContractAt('IUniswapV2Pair', pool1)) as IUniswapV2Pair;
    const [pool0_token0, pool0_token1, pool1_token0, pool1_token1]: string[] = await Promise.all([
        uniswapV2PairPool0.token0(),
        uniswapV2PairPool0.token1(),
        uniswapV2PairPool1.token0(),
        uniswapV2PairPool1.token1(),
    ])
    // console.log(pool0_token0, pool0_token1, pool1_token0, pool1_token1)

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

export async function getOrderedReserves(
    pool0: string,
    pool1: string,
    isBaseTokenSmaller: boolean
): Promise<OrderedReservesEnhanced> {
    const uniswapV2PairPool0 = (await ethers.getContractAt('IUniswapV2Pair', pool0)) as IUniswapV2Pair;
    const uniswapV2PairPool1 = (await ethers.getContractAt('IUniswapV2Pair', pool1)) as IUniswapV2Pair;


    let [tmpReservesPool0, tmpReservesPool1] = await Promise.all([
        uniswapV2PairPool0.getReserves(),
        uniswapV2PairPool1.getReserves(),
    ]);
    // console.log(reservesPool0, reservesPool1);

    let reservesPool0: MatchedPoolReserves;
    let reservesPool1: MatchedPoolReserves;

    if (isBaseTokenSmaller) {
        reservesPool0 = {
            baseTokenReserves: tmpReservesPool0.reserve0,
            quoteTokenReserves: tmpReservesPool0.reserve1
        };
        reservesPool1 = {
            baseTokenReserves: tmpReservesPool1.reserve0,
            quoteTokenReserves: tmpReservesPool1.reserve1
        }
    } else {
        reservesPool0 = {
            baseTokenReserves: tmpReservesPool0.reserve1,
            quoteTokenReserves: tmpReservesPool0.reserve0
        };
        reservesPool1 = {
            baseTokenReserves: tmpReservesPool1.reserve1,
            quoteTokenReserves: tmpReservesPool1.reserve0
        }
    }
    // console.log(`Reserves0: ${reservesPool0.baseTokenReserves}, ${reservesPool0.quoteTokenReserves}`)
    // console.log(`Reserves1: ${reservesPool1.baseTokenReserves}, ${reservesPool1.quoteTokenReserves}`)

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

    // console.log(`Prices: ${pricePool0}, ${pricePool1}`)

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

export function calculateBorrowAmount(reserves: OrderedReserves): BigNumberPrecise {
    // 1. (a1, b1) represents the pool with lower price (price denominated in quote asset token)
    // 2. (a2, b2) represents the pool with higher price (price denominated in quote asset token)
    // 3. (a1, a2) are the base tokens in two pools
    // 4. (b1, b2) are the quote tokens in two pools
    const a1 = BigNumberPrecise(reserves.lowerPricePoolBaseToken.toString());
    const a2 = BigNumberPrecise(reserves.higherPricePoolBaseToken.toString());
    const b1 = BigNumberPrecise(reserves.lowerPricePoolQuoteToken.toString());
    const b2 = BigNumberPrecise(reserves.higherPricePoolQuoteToken.toString());

    // a1 * b1 - a2 * b2;
    const a: BigNumberPrecise =
        (
            a1.multipliedBy(b1)
        )
            .minus
            (
                a2.multipliedBy(b2)
            );
    // 2 * b1 * b2 * (a1 + a2)
    const b: BigNumberPrecise =
        BigNumberPrecise("2")
            .multipliedBy(b1)
            .multipliedBy(b2)
            .multipliedBy(
                a1.plus(a2)
            );
    // b1 * b2 * (a1 * b2 - a2 * b1)
    const c: BigNumberPrecise =
        b1.multipliedBy(b2)
            .multipliedBy(
                a1.multipliedBy(b2)
                    .minus(
                        a2.multipliedBy(b1)
                    )
            );

    let m: BigNumberPrecise = b.pow("2")
        .minus(
            BigNumberPrecise("4")
                .multipliedBy(a)
                .multipliedBy(c)
        );
    // m < 0 leads to complex number
    if (m.isNegative()) {
        throw Error("Error: discriminant value is negative! Solutions to quadratic equation are complex!");
    }

    const sqrtM = m.sqrt();
    // (-b +- sqrtM) / (2 * a)
    const x1 =
        (
            b.multipliedBy("-1").plus(sqrtM)
        )
            .div(
                BigNumberPrecise("2").multipliedBy(a)
            );
    const x2 =
        (
            b.multipliedBy("-1").minus(sqrtM)
        ).div(
            BigNumberPrecise("2").multipliedBy(a)
        );

    // console.log(
    //     x1.decimalPlaces(0, 1).toString(),
    //     x2.decimalPlaces(0, 1).toString(),
    //     b1.decimalPlaces(0, 1).toString(),
    //     b2.decimalPlaces(0, 1).toString(),
    //     a.decimalPlaces(0, 1).toString(),
    //     b.decimalPlaces(0, 1).toString(),
    //     c.decimalPlaces(0, 1).toString()
    // )
    // see readme for solution of the resulting system and constraints checked here
    if (!((x1.isPositive() && x1.lt(b1)) || (x2.isPositive() && x2.lt(b1)))) {
        throw Error("Bad solution!");
    }


    if (x1.isPositive() && x1.lt(b1)) {
        return x1;
    } else {
        return x2;
    }
}

// copy from UniswapV2Library
// given an output amount of an asset and pair reserves, returns a required input amount of the other asset
// (Q - dQ) * (B + (dB * 0.997)) = K -> borrowing quote tokens, debt in base tokens
// We have dQ, want to estimate dB (how much we'll have to repay once arbitrage is done)
export function getAmountIn(
    borrowAmount: BigNumber, // we want to borrow this many tokens
    baseTokenReserves: BigNumber, // B
    quoteTokenReserves: BigNumber // Q
) {
    const zero = BigNumber.from("0")
    if (borrowAmount.lte(zero)) {
        throw Error('Error in UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');
    }
    if (baseTokenReserves.lte(zero) || quoteTokenReserves.lte(zero)) {
        throw Error('Error in UniswapV2Library: INSUFFICIENT_LIQUIDITY');
    }
    const numerator = baseTokenReserves.mul(borrowAmount).mul(1000);
    const denominator = quoteTokenReserves.sub(borrowAmount).mul(997);
    return (numerator.div(denominator)).add(1);
}

// given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
// (Q + (dQ * 0.997)) * (B - dB) = K -> giving part of borrowed tokens, getting base tokens
// We have dQ, want to estimate dB (how much we'll get once arbitrage is done)
export function getAmountOut(
    sellAmount: BigNumber, // number of quote tokens we'll trade in
    baseTokenReserves: BigNumber, // reserves of base tokens
    quoteTokenReserves: BigNumber, // reserves of quote tokens
) {
    const zero = BigNumber.from(0)
    if (sellAmount.lte(zero)) {
        throw Error('Error in UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
    }
    if (baseTokenReserves.lte(zero) || quoteTokenReserves.lte(zero)) {
        throw Error('Error in UniswapV2Library: INSUFFICIENT_LIQUIDITY')
    }
    const sellAmountWithFee = sellAmount.mul(997)
    const numerator = sellAmountWithFee.mul(baseTokenReserves)
    const denominator = quoteTokenReserves.mul(1000).add(sellAmountWithFee)
    return numerator.div(denominator)
}