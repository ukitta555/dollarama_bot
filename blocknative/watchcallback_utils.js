import BigNumberPrecise from "BigNumber.js";
import config from "./config.js";
// import {BigNumber} from "ethers";


export function getProfit (pool0, pool1) {
    const [pool0_token0, pool0_token1] = Array.from(pool0.keys());
    const [pool1_token0, pool1_token1] = Array.from(pool1.keys());
    // const [pool0_token0, pool0_token1, pool1_token0, pool1_token1] = Array.from(pool0.keys()).concat(Array.from(pool1.keys()))
    const {isBaseTokenSmaller, baseToken, quoteToken} = isBaseTokenSmallerWeb3(pool0_token0, pool0_token1, pool1_token0, pool1_token1);
    const {lowerPricePool, higherPricePool, orderedReserves} = getOrderedReserves(pool0, pool1, isBaseTokenSmaller);
    console.log(`Lower price pool address: ${lowerPricePool}`)
    console.log(`Higher price pool address: ${higherPricePool}`)

    // for conversion from precise to non-precise - I know this is not ideal but it works
    BigNumberPrecise.config({ EXPONENTIAL_AT: 1e+9 })

    let borrowAmount = BigInt(
        calculateBorrowAmount(orderedReserves)
            .decimalPlaces(0, 1)
            .toString()
    ); // refactor?
    // Seems like getAmountIn and getAmountOut are needed to do a reality check for what we have calculated in quadratic equation
    const debtAmount = getAmountIn(
        borrowAmount,
        orderedReserves.lowerPricePoolBaseToken,
        orderedReserves.lowerPricePoolQuoteToken
    )
    const baseTokenGrossProfit = getAmountOut(
        borrowAmount,
        orderedReserves.higherPricePoolBaseToken,
        orderedReserves.higherPricePoolQuoteToken,
    )
    if (baseTokenGrossProfit.lt(debtAmount)) {
        return {
            profit: BigInt.from(0),
            baseToken
        }
    } else {
        return {
            profit: baseTokenGrossProfit.sub(debtAmount),
            baseToken
        }
    }
}


export function isBaseTokenSmallerWeb3 (pool0_token0, pool0_token1, pool1_token0, pool1_token1) {
    console.log(pool0_token0, pool0_token1, pool1_token0, pool1_token1)

    if (
        BigInt(pool0_token0) >= (BigInt(pool0_token1))
        ||
        BigInt(pool1_token0) >= (BigInt(pool1_token1))
    ) {
        throw new Error("Error: non-standard AMM pair!");
    }

    if (BigInt(pool0_token0) == (BigInt(pool0_token1))) {
        throw new Error("Error: same token pair!");
    }

    if (
        !BigInt(pool0_token0)== (config.baseTokenAddress)
        &&
        !BigInt(pool0_token1)==(config.baseTokenAddress)
    ) {
        throw new Error("Error: no base token in LP pair!")
    }

    const isBaseTokenSmaller = BigInt(pool0_token0)==(config.baseTokenAddress)

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

export function getOrderedReserves (
    pool0,
    pool1,
    isBaseTokenSmaller
) {
 
    const [token0, token1] = Array.from(pool0.keys());
    const [pool0_token0, pool0_token1, pool1_token0, pool1_token1] = [pool0.get(token0), pool0.get(token1), pool1.get(token0), pool1.get(token1)]
    let [tmpReservesPool0, tmpReservesPool1] = [{reserve0: pool0_token0, reserve1: pool0_token1}, {reserve0: pool1_token0, reserve1: pool1_token1}]

    let reservesPool0;
    let reservesPool1;

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
    console.log(`Reserves0: ${reservesPool0.baseTokenReserves}, ${reservesPool0.quoteTokenReserves}`)
    console.log(`Reserves1: ${reservesPool1.baseTokenReserves}, ${reservesPool1.quoteTokenReserves}`)

    // probably a bug in smart contract - Solidity does not support precise division of uint's,
    // so there was a possibility that params were not calculated correctly
    // possibly can include this in the report...
    const pricePool0 = reservesPool0.baseTokenReserves/reservesPool0.quoteTokenReserves
    const pricePool1 = reservesPool1.baseTokenReserves/reservesPool1.quoteTokenReserves

    console.log(`Prices: ${pricePool0}, ${pricePool1}`)

    let lowerPricePool;
    let higherPricePool;
    let lowerPricePoolReserves;
    let higherPricePoolReserves;

    if (pricePool0 > pricePool1) {
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

    let orderedReserves = {
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
export function calculateBorrowAmount(reserves) {
    // 1. (a1, b1) represents the pool with lower price (price denominated in quote asset token)
    // 2. (a2, b2) represents the pool with higher price (price denominated in quote asset token)
    // 3. (a1, a2) are the base tokens in two pools
    // 4. (b1, b2) are the quote tokens in two pools
    const a1 = BigNumberPrecise(reserves.lowerPricePoolBaseToken.toString());
    const a2 = BigNumberPrecise(reserves.higherPricePoolBaseToken.toString());
    const b1 = BigNumberPrecise(reserves.lowerPricePoolQuoteToken.toString());
    const b2 = BigNumberPrecise(reserves.higherPricePoolQuoteToken.toString());

    // a1 * b1 - a2 * b2;
    const a =
        (
            a1.multipliedBy(b1)
        )
            .minus
            (
                a2.multipliedBy(b2)
            );
    // 2 * b1 * b2 * (a1 + a2)
    const b =
        BigNumberPrecise("2")
            .multipliedBy(b1)
            .multipliedBy(b2)
            .multipliedBy(
                a1.plus(a2)
            );
    // b1 * b2 * (a1 * b2 - a2 * b1)
    const c =
        b1.multipliedBy(b2)
            .multipliedBy(
                a1.multipliedBy(b2)
                    .minus(
                        a2.multipliedBy(b1)
                    )
            );

    let m = b.pow("2")
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

    // see readme for solution of the resulting system and constraints checked here
    if (!((x1.isPositive() && x1.lt(b1) && x1.lt(b2)) || (x2.isPositive() && x2.lt(b1) && x2.lt(b2)))) {
        throw Error("Bad solution!");
    }


    if (x1.isPositive() && x1.lt(b1) && x1.lt(b2)) {
        return x1;
    } else {
        return x2;
    }
}