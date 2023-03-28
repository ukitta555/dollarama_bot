import lodash from 'lodash';
import { expect } from 'chai';
import {ethers, waffle} from 'hardhat';
import { InternalFuncTest } from '../typechain/InternalFuncTest';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Contract} from "@ethersproject/contracts";
import {IWETH} from "../typechain";

const { BigNumber } = ethers;

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateParams(min: number, max: number) {
    var a = getRandomInt(min, max);
    var b = getRandomInt(min, max);
    var c = getRandomInt(min, max);
    while (b*b - 4*a*c < 0) {
        a = getRandomInt(min, max);
        b = getRandomInt(min, max);
        c = getRandomInt(min, max);
    }
    return [a.toString(), b.toString(), c.toString()];
}

describe('GasUsage', () => {
    let weth: IWETH;
    let flashBot: InternalFuncTest;
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
        // get WBNB contract
        const wethFactory = (await ethers.getContractAt('IWETH', WBNB)) as IWETH;
        // access deployed instance of WBNB contract
        weth = wethFactory.attach(WBNB);

        const factory = await ethers.getContractFactory('InternalFuncTest');
        flashBot = (await factory.deploy(WBNB)) as InternalFuncTest;
    });

    // in these test cases, we only worry about the gas usages
    // describe('#gas usage for naive square root', () => {
    //   it('with function call', async () => {
    //     const gases = [];
    //     for(let i = 0; i < 10; i++) {
    //         const [a, b, c] = generateParams(-1000000000000000, 1000000000000000).map((v) => ethers.utils.parseEther(v));
    //         const gas = await flashBot._estimateGasCostQuadratic1(a, b, c);
    //         gases.push(gas)
    //     }
    //     const sum = gases.reduce((acc, curr) => acc.add(curr), BigNumber.from(0));
    //     console.log("Gas used: ", sum.div(BigNumber.from(gases.length)));
    //     expect(true);
    //   });
    //
    //   it('no function call', async () => {
    //     const gases = [];
    //     for(let i = 0; i < 10; i++) {
    //         const [a, b, c] = generateParams(-1000000000000000, 1000000000000000).map((v) => ethers.utils.parseEther(v));
    //         const gas = await flashBot._estimateGasCostQuadratic2(a, b, c);
    //         gases.push(gas)
    //     }
    //     const sum = gases.reduce((acc, curr) => acc.add(curr), BigNumber.from(0));
    //     console.log("Gas used: ", sum.div(BigNumber.from(gases.length)));
    //     expect(true);
    //   });
    // });
    //
    // describe('#calcSolutionForQuadratic ABDK', () => {
    //   it('with function call', async () => {
    //     const gases = [];
    //     for(let i = 0; i < 10; i++) {
    //         const [a, b, c] = generateParams(-1000000000000000, 1000000000000000).map((v) => ethers.utils.parseEther(v));
    //         const gas = await flashBot._estimateGasCostABDK(a, b, c);
    //         gases.push(gas)
    //     }
    //     const sum = gases.reduce((acc, curr) => acc.add(curr), BigNumber.from(0));
    //     console.log("Gas used: ", sum.div(BigNumber.from(gases.length)));
    //     expect(true);
    //   });
    //
    //   it('no function call', async () => {
    //     const gases = [];
    //     for(let i = 0; i < 10; i++) {
    //         const [a, b, c] = generateParams(-1000000000000000, 1000000000000000).map((v) => ethers.utils.parseEther(v));
    //         const gas = await flashBot._estimateGasCostABDK2(a, b, c);
    //         console.log(gas)
    //         gases.push(gas)
    //     }
    //     const sum = gases.reduce((acc, curr) => acc.add(curr), BigNumber.from(0));
    //     console.log("Gas used: ", sum.div(BigNumber.from(gases.length)));
    //     expect(true);
    //   });
    // });

    // describe("Arbitrage function", async () => {
    //     it("current implementation", async () => {
    //         const amountEth = ethers.utils.parseEther('100000');
    //         await weth.deposit({ value: amountEth });
    //         await weth.transfer(mdexPairAddr, amountEth);
    //         await mdexPair.connect(signer).sync();
    //
    //         const gases = []
    //         const gas = await flashBot.callStatic._estimateGasCostArbitrage(mdexPairAddr, pancakePairAddr);
    //         console.log("Gas used: ", gas);
    //         expect(true);
    //     })
    // })
});
  