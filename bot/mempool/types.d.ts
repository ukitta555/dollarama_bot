import {BigNumber} from "ethers";

export interface Pool {
    address: string,
    token0Address: string,
    token1Address: string,
    reserve0: BigNumber,
    reserve1: BigNumber
}

export interface ReserveUpdate {
    token0Address: string,
    token1Address: string,
    reserve0Delta: BigNumber,
    reserve1Delta: BigNumber
}