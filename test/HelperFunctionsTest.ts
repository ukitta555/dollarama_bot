import {InternalFuncTest, IWETH} from "../typechain";
import {ethers, waffle} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Contract} from "@ethersproject/contracts";
import {expect} from "chai";
import {getOrderedReserves, isBaseTokenSmallerWeb3} from "../bot/utils";

describe("Helper Functions", () => {
    let weth: IWETH;
    let flashBot: InternalFuncTest;

    // USDT's address is smaller -> it should be returned from token0() call
    // Analogous for WBNB -> should be returned from token1() call
    const USDT = '0x55d398326f99059ff775485246999027b3197955';
    const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

    let signer: SignerWithAddress;

    // ABI of methods we are interested in...
    const uniFactoryAbi = ['function getPair(address, address) view returns (address pair)'];
    const uniPairAbi = ['function sync()'];

    const mdexFactoryAddr = '0x3CD1C46068dAEa5Ebb0d3f55F6915B10648062B8';
    const mdexFactory = new ethers.Contract(mdexFactoryAddr, uniFactoryAbi, waffle.provider);
    let mdexPairAddr: any;
    let mdexPair: Contract;

    const pancakeFactoryAddr = '0xBCfCcbde45cE874adCB698cC183deBcF17952812';
    const pancakeFactory = new ethers.Contract(pancakeFactoryAddr, uniFactoryAbi, waffle.provider);
    let pancakePairAddr: any;

    before(async () => {
        [signer] = await ethers.getSigners();
        mdexPairAddr = await mdexFactory.getPair(WBNB, USDT);
        mdexPair = new ethers.Contract(mdexPairAddr, uniPairAbi, waffle.provider); // 0x09cb618bf5ef305fadfd2c8fc0c26eecf8c6d5fd
        pancakePairAddr = await pancakeFactory.getPair(WBNB, USDT); // 0x20bcc3b8a0091ddac2d0bc30f68e6cbb97de59cd
    });

    beforeEach(async () => {
        // get USDT contract
        const wethFactory = (await ethers.getContractAt('IWETH', USDT)) as IWETH;
        // access deployed instance of USDT contract
        weth = wethFactory.attach(WBNB);

        const fbFactory = await ethers.getContractFactory('InternalFuncTest');
        // deploy FlashBot contract with USDT contract address as an argument to the constructor
        flashBot = (await fbFactory.deploy(WBNB)) as InternalFuncTest;
    });

    describe("isBaseTokenSmaller", () => {
        it(" should correctly define the base and quote token", async () => {
            const {isBaseTokenSmaller, baseToken, quoteToken} = await isBaseTokenSmallerWeb3(mdexPairAddr, pancakePairAddr)
            expect(isBaseTokenSmaller).to.be.false;
            expect(baseToken.toLowerCase()).to.be.eq(WBNB.toLowerCase())
            expect(quoteToken.toLowerCase()).to.be.eq(USDT.toLowerCase())
        })
    })

    describe("getOrderedReserves", () => {
        it("should correctly define the pools with smaller quote token price", async () => {
            const {lowerPricePool, higherPricePool, orderedReserves} = await getOrderedReserves(
                mdexPairAddr,
                pancakePairAddr,
                false // base token is WBNB -> address is bigger
            )
            expect(lowerPricePool.toLowerCase()).to.be.eq(pancakePairAddr.toLowerCase())
            expect(higherPricePool.toLowerCase()).to.be.eq(mdexPairAddr.toLowerCase())
            console.log(orderedReserves)
        })
    })
})