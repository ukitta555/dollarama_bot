import lodash from 'lodash';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { InternalFuncTest } from '../typechain/InternalFuncTest';

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
    let flashBot: InternalFuncTest;
    const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

    beforeEach(async () => {
      const factory = await ethers.getContractFactory('InternalFuncTest');
      flashBot = (await factory.deploy(WBNB)) as InternalFuncTest;
    });

    // in these test cases, we only worry about the gas usages
    describe('#gas usage for naive square root', () => {
      it('with function call', async () => {
        const gases = [];
        for(let i = 0; i < 10; i++) {
            const [a, b, c] = generateParams(-1000000000000000, 1000000000000000).map((v) => ethers.utils.parseEther(v));
            const gas = await flashBot._estimateGasCostQuadratic1(a, b, c);
            gases.push(gas)
        }
        const sum = gases.reduce((acc, curr) => acc.add(curr), BigNumber.from(0));
        console.log("Gas used: ", sum.div(BigNumber.from(gases.length)));
        expect(true);
      });
  
      it('no function call', async () => {
        const gases = [];
        for(let i = 0; i < 10; i++) {
            const [a, b, c] = generateParams(-1000000000000000, 1000000000000000).map((v) => ethers.utils.parseEther(v));
            const gas = await flashBot._estimateGasCostQuadratic2(a, b, c);
            gases.push(gas)
        }
        const sum = gases.reduce((acc, curr) => acc.add(curr), BigNumber.from(0));
        console.log("Gas used: ", sum.div(BigNumber.from(gases.length)));
        expect(true);
      });
    });
  
    describe('#calcSolutionForQuadratic ABDK', () => {
      it('with function call', async () => {
        const gases = [];
        for(let i = 0; i < 10; i++) {
            const [a, b, c] = generateParams(-1000000000000000, 1000000000000000).map((v) => ethers.utils.parseEther(v));
            const gas = await flashBot._estimateGasCostABDK(a, b, c);
            gases.push(gas)
        }
        const sum = gases.reduce((acc, curr) => acc.add(curr), BigNumber.from(0));
        console.log("Gas used: ", sum.div(BigNumber.from(gases.length)));
        expect(true);
      });
  
      it('no function call', async () => {
        const gases = [];
        for(let i = 0; i < 10; i++) {
            const [a, b, c] = generateParams(-1000000000000000, 1000000000000000).map((v) => ethers.utils.parseEther(v));
            const gas = await flashBot._estimateGasCostABDK2(a, b, c);
            gases.push(gas)
        }
        const sum = gases.reduce((acc, curr) => acc.add(curr), BigNumber.from(0));
        console.log("Gas used: ", sum.div(BigNumber.from(gases.length)));
        expect(true);
      });
    });
});
  