import {BigNumber} from "ethers";

export interface OrderedReserves {
    lowerPricePoolBaseToken: BigNumber,
    higherPricePoolBaseToken: BigNumber,
    lowerPricePoolQuoteToken: BigNumber,
    higherPricePoolQuoteToken: BigNumber,
}
export interface OrderedReservesEnhanced {
    lowerPricePool: string,
    higherPricePool: string,
    orderedReserves: OrderedReserves
}

export interface PoolReservesShort {
    _reserve0: BigNumber,
    _reserve1: BigNumber,
}

export interface MatchedPoolReserves {
    baseTokenReserves: BigNumber,
    quoteTokenReserves: BigNumber,
}

export type Nullable<T> = T | null;

export type isBaseTokenSmallerFuncType =(pool0: string, pool1: string) =>
    Promise<{
        isBaseTokenSmaller: boolean,
        baseToken: string,
        quoteToken: string
    }>

export type getOrderedReservesFuncType = (pool0: string, pool1: string, isBaseTokenSmaller: boolean) =>
    Promise<OrderedReservesEnhanced>