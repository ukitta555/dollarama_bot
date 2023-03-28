import {BigNumber} from "ethers";
import {OrderedReservesEnhanced} from "./types";
import {calculateBorrowAmount, getAmountIn, getAmountOut, getOrderedReserves, isBaseTokenSmallerWeb3} from "./utils";
import BigNumberPrecise from "bignumber.js";


export async function getProfit(pool0: string, pool1: string): Promise<{
    profit: BigNumber;
    baseToken: string;
}> {
    const {isBaseTokenSmaller, baseToken, quoteToken} = await isBaseTokenSmallerWeb3(pool0, pool1);
    const {lowerPricePool, higherPricePool, orderedReserves}: OrderedReservesEnhanced = await getOrderedReserves(pool0, pool1, isBaseTokenSmaller);
    console.log(`Lower price pool address: ${lowerPricePool}`)
    console.log(`Higher price pool address: ${higherPricePool}`)

    // for conversion from precise to non-precise - I know this is not ideal but it works
    BigNumberPrecise.config({ EXPONENTIAL_AT: 1e+9 })

    // .decimalPlaces(decimal_places: 0, rounding_mode: 1)
    // The rounding mode used when rounding to the above decimal places, and when using
    // toExponential, toFixed, toFormat and toPrecision, and round (default value).
    // UP         0 Away from zero.
    // DOWN       1 Towards zero. - WE USE THIS
    // CEIL       2 Towards +Infinity.
    // FLOOR      3 Towards -Infinity.
    // HALF_UP    4 Towards nearest neighbour. If equidistant, up.
    // HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
    // HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
    // HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
    // HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
    let borrowAmount: BigNumber = BigNumber.from(
        calculateBorrowAmount(orderedReserves)
            .decimalPlaces(0, 1)
            .toString()
    ); // refactor?
    // Seems like getAmountIn and getAmountOut are needed to do a reality check for what we have calculated in quadratic equation
    const debtAmount: BigNumber = getAmountIn(
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
            profit: BigNumber.from(0),
            baseToken
        }
    } else {
        return {
            profit: baseTokenGrossProfit.sub(debtAmount),
            baseToken
        }
    }
}

