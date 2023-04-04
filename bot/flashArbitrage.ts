import {calculateBorrowAmount, getAmountIn, getAmountOut } from "./utils";
import BigNumberPrecise from "bignumber.js";
import {BigNumber, BigNumberish} from "ethers";
import {AbiCoder} from "ethers/lib/utils";
import {FlashBotDev} from "../typechain";
import {getOrderedReservesFuncType, isBaseTokenSmallerFuncType} from "./types";
import { OrderedReservesEnhanced } from "./types";

export async function flashArbitrage(
    isBaseTokenSmallerFunc: isBaseTokenSmallerFuncType,
    getOrderedReservesFunc: getOrderedReservesFuncType,
    pool0: string,
    pool1: string,
    flashBot: FlashBotDev,
    config: {
        gasPrice: BigNumber,
        gasLimit: BigNumberish,
        // nonce: number
    }
) {
    const {isBaseTokenSmaller, baseToken, quoteToken} = await isBaseTokenSmallerFunc(pool0, pool1);
    const {lowerPricePool, higherPricePool, orderedReserves} = await getOrderedReservesFunc(
        pool0,
        pool1,
        isBaseTokenSmaller
    );
    BigNumberPrecise.config({ EXPONENTIAL_AT: 1e+9 })
    const amountToBorrow: BigNumber =
         BigNumber.from(
            calculateBorrowAmount(orderedReserves)
                .decimalPlaces(0, 1)
                .toString()
    );
    const [amountOut0, amountOut1] = isBaseTokenSmaller ? [0, amountToBorrow] : [amountToBorrow, 0]
    const debtAmount = getAmountIn(
        amountToBorrow,
        orderedReserves.lowerPricePoolBaseToken,
        orderedReserves.lowerPricePoolQuoteToken
    )
    const baseTokenGrossProfit = getAmountOut(
        amountToBorrow,
        orderedReserves.higherPricePoolBaseToken,
        orderedReserves.higherPricePoolQuoteToken,
    )
    if (baseTokenGrossProfit.lt(debtAmount)) {
        throw Error("Error: arbitrage fail, no profit!");
    }
    console.log(`Profit: ${
        baseTokenGrossProfit.sub(debtAmount)
    }`)

    /*
    address debtPool;
    address targetPool;
    bool debtTokenSmaller;
    address borrowedToken;
    address debtToken;
    uint256 debtAmount;
    uint256 debtTokenOutAmount;
     */
    const encodedCallbackArgs = AbiCoder.prototype.encode(
    ['address', 'address', 'bool', 'address', 'address', 'uint256', 'uint256'],
        [lowerPricePool, higherPricePool, isBaseTokenSmaller, quoteToken, baseToken, debtAmount, baseTokenGrossProfit]
    )
    return await flashBot.flashArbitrage(
        lowerPricePool,
        baseToken,
        amountOut0,
        amountOut1,
        encodedCallbackArgs,
        config
    )
}