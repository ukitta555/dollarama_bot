import {calculateBorrowAmount, getAmountIn, getAmountOut, getOrderedReserves, isBaseTokenSmallerWeb3} from "./utils";
import BigNumberPrecise from "bignumber.js";
import {BigNumber, BigNumberish} from "ethers";
import {AbiCoder} from "ethers/lib/utils";
import config from "./config";
import {FlashBot} from "../typechain";
import base = Mocha.reporters.base;

export async function flashArbitrage(
    pool0: string,
    pool1: string,
    flashBot: FlashBot,
    config: {
        gasPrice: BigNumber,
        gasLimit: BigNumberish,
        // nonce: BigNumberish
    }
) {
    const {isBaseTokenSmaller, baseToken, quoteToken} = await isBaseTokenSmallerWeb3(pool0, pool1);
    const {lowerPricePool, higherPricePool, orderedReserves} = await getOrderedReserves(pool0, pool1, isBaseTokenSmaller);
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
        (
            baseTokenGrossProfit
                .sub(debtAmount)
        )
            .div(
                BigNumber
                    .from("10")
                    .pow("18")
            )
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
    const decodedCallbackArgs = AbiCoder.prototype.decode(
        ['address', 'address', 'bool', 'address', 'address', 'uint256', 'uint256'],
        encodedCallbackArgs
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