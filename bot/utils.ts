import {BigNumber} from "ethers";
import BigNumberPrecise from "bignumber.js"

export function divideBigNums(x: BigNumber, y: BigNumber): BigNumberPrecise {
    BigNumberPrecise.set({ DECIMAL_PLACES: 20 })

    const xPrecise = BigNumberPrecise(x.toString())
    const yPrecise = BigNumberPrecise(y.toString())
    console.log(`Precise: ${xPrecise} ${yPrecise}`)
    console.log(`Division: ${xPrecise.div(yPrecise)}`)
    return xPrecise.div(yPrecise)

}