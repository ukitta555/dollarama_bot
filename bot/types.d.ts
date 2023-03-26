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
    reserve0: BigNumber,
    reserve1: BigNumber,
}

export interface MatchedPoolReserves {
    baseTokenReserves: BigNumber,
    quoteTokenReserves: BigNumber,
}

export type Nullable<T> = T | null;
