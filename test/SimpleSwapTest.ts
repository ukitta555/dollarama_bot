import { Contract } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import { FlashBot } from '../typechain/FlashBot';
import { IWETH } from '../typechain/IWETH';
import {getProfit} from "../bot/getProfit";
import {flashArbitrage} from "../bot/flashArbitrage";
import {BigNumber, utils} from "ethers";
import {getOrderedReserves, isBaseTokenSmallerWeb3} from "../bot/utils";
import {FlashBotDev, SimpleSwap} from "../typechain";

describe('Swap', () => {
    let coin1: IWETH;
    let swapper: SimpleSwap;

    const pair = "0xd6C41618DBcb698938da6B46e8B61034773A5467"
    const token = "0xcaF30Af12f5BFb687a50eCeDcC308170DF653F1f"


    beforeEach(async () => {
        const simpleSwapFactory = await ethers.getContractFactory('SimpleSwap');
        // deploy FlashBot contract with WBNB contract address as an argument to the constructor
        swapper = (await simpleSwapFactory.deploy()) as SimpleSwap;
    });

    describe('Simple swap', () => {

        it('try doing simple swaps', async () => {
            await swapper.swap(
                pair,
                token,
                BigNumber.from("98715803439706129885"),
                0,
                BigNumber.from("100000000000000000000"),
                )
        });
    });
});
