import lodash from 'lodash';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { InternalFuncTest } from '../typechain/InternalFuncTest';
import {calculateBorrowAmount} from "../bot/getProfit";
import {OrderedReserves} from "../bot/types";
import BigNumberPrecise from "bignumber.js";

const { BigNumber } = ethers;

describe('MathTest', () => {
  let flashBot: InternalFuncTest;
  const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

  beforeEach(async () => {
    const factory = await ethers.getContractFactory('InternalFuncTest');
    flashBot = (await factory.deploy(WBNB)) as InternalFuncTest;
  });

  // describe('#sqrt', () => {
  //   it('calculate square root correctly with small input', async () => {
  //     const input = BigNumber.from('100');
  //     const res = await flashBot._sqrt(input);
  //     expect(res).to.be.eq(BigNumber.from(10));
  //   });
  //
  //   it('calculate square root correctly with large input', async () => {
  //     const input = ethers.utils.parseEther('10000');
  //     const res = await flashBot._sqrt(input);
  //     expect(res).to.be.eq(BigNumber.from('100000000000'));
  //   });
  // });
  //
  // describe('#sqrt2, using 7 iterations only', () => {
  //   it('calculate square root correctly with small input', async () => {
  //     const input = BigNumber.from('100');
  //     const res = await flashBot._sqrt2(input);
  //     expect(res).to.be.eq(BigNumber.from(10));
  //   });
  //
  //   it('calculate square root correctly with large input', async () => {
  //     const input = ethers.utils.parseEther('10000');
  //     const res = await flashBot._sqrt2(input);
  //     expect(res).to.be.eq(BigNumber.from('100000000000'));
  //   });
  // });
  //
  // describe('#calcSolutionForQuadratic', () => {
  //   it('calculate right solution for quadratic', async () => {
  //     const [a, b, c] = ['59995000000', '120100000000000', '59500000000000000'].map((v) => ethers.utils.parseEther(v));
  //     const [x1, x2] = await flashBot._calcSolutionForQuadratic(a, b, c);
  //
  //     expect(x1).to.be.eq(BigNumber.from('-900'));
  //     expect(x2).to.be.eq(BigNumber.from('-1101'));
  //   });
  //
  //   it('calculate right solution for quadratic with negative number', async () => {
  //     const [a, b, c] = ['-10000000000', '2200000000000000', '-1000000000000000000'].map((v) =>
  //       ethers.utils.parseEther(v)
  //     );
  //     const [x1, x2] = await flashBot._calcSolutionForQuadratic(a, b, c);
  //
  //     expect(x1).to.be.eq(BigNumber.from('455'));
  //     expect(x2).to.be.eq(BigNumber.from('219544'));
  //   });
  // });
  //
  // describe('#calcSolutionForQuadratic2', () => {
  //   it('calculate right solution for quadratic', async () => {
  //     const [a, b, c] = ['59995000000', '120100000000000', '59500000000000000'].map((v) => ethers.utils.parseEther(v));
  //     const [x1, x2] = await flashBot._calcSolutionForQuadratic2(a, b, c);
  //
  //     expect(x1).to.be.eq(BigNumber.from('-900'));
  //     expect(x2).to.be.eq(BigNumber.from('-1101'));
  //   });
  //
  //   it('calculate right solution for quadratic with negative number', async () => {
  //     const [a, b, c] = ['-10000000000', '2200000000000000', '-1000000000000000000'].map((v) =>
  //       ethers.utils.parseEther(v)
  //     );
  //     const [x1, x2] = await flashBot._calcSolutionForQuadratic2(a, b, c);
  //
  //     expect(x1).to.be.eq(BigNumber.from('455'));
  //     expect(x2).to.be.eq(BigNumber.from('219544'));
  //   });
  // });
  //
  // describe('#calcSolutionForQuadratic ABDK', () => {
  //   it('calculate right solution for quadratic', async () => {
  //     const [a, b, c] = ['59995000000', '120100000000000', '59500000000000000'].map((v) => ethers.utils.parseEther(v));
  //     const [x1, x2] = await flashBot._calcSolutionForQuadraticABDK(a, b, c);
  //
  //     expect(x1).to.be.eq(BigNumber.from('-900'));
  //     expect(x2).to.be.eq(BigNumber.from('-1101'));
  //   });
  //
  //   it('calculate right solution for quadratic with negative number', async () => {
  //     const [a, b, c] = ['-10000000000', '2200000000000000', '-1000000000000000000'].map((v) =>
  //       ethers.utils.parseEther(v)
  //     );
  //     const [x1, x2] = await flashBot._calcSolutionForQuadraticABDK(a, b, c);
  //
  //     expect(x1).to.be.eq(BigNumber.from('455'));
  //     expect(x2).to.be.eq(BigNumber.from('219544'));
  //   });
  // });
  //
  // describe('#calcSolutionForQuadratic ABDK2', () => {
  //   it('calculate right solution for quadratic', async () => {
  //     const [a, b, c] = ['59995000000', '120100000000000', '59500000000000000'].map((v) => ethers.utils.parseEther(v));
  //     const [x1, x2] = await flashBot._calcSolutionForQuadraticABDK2(a, b, c);
  //
  //     expect(x1).to.be.eq(BigNumber.from('-900'));
  //     expect(x2).to.be.eq(BigNumber.from('-1101'));
  //   });
  //
  //   it('calculate right solution for quadratic with negative number', async () => {
  //     const [a, b, c] = ['-10000000000', '2200000000000000', '-1000000000000000000'].map((v) =>
  //       ethers.utils.parseEther(v)
  //     );
  //     const [x1, x2] = await flashBot._calcSolutionForQuadraticABDK2(a, b, c);
  //
  //     expect(x1).to.be.eq(BigNumber.from('455'));
  //     expect(x2).to.be.eq(BigNumber.from('219544'));
  //   });
  // });

  describe('calcBorrowAmount web2', () => {
    it('returns right amount with small liquidity pairs', async () => {
      const reserves: OrderedReserves = {
        lowerPricePoolBaseToken: BigNumber.from('5000'),
        lowerPricePoolQuoteToken: BigNumber.from('10'),
        higherPricePoolBaseToken: BigNumber.from('6000'),
        higherPricePoolQuoteToken: BigNumber.from('10')
      };
      const res = calculateBorrowAmount(reserves);
      console.log(res.toNumber())
      // @ts-ignore
      expect(res.toNumber()).to.be.closeTo(0.45, 0.01);
    });

    it('returns right amount with large liquidity pairs', async () => {
      const reserves: OrderedReserves = {
        lowerPricePoolBaseToken: BigNumber.from('1200000000'),
        lowerPricePoolQuoteToken: BigNumber.from('600000'),
        higherPricePoolBaseToken: BigNumber.from('1000000000'),
        higherPricePoolQuoteToken: BigNumber.from('300000' )
      };
      const res = calculateBorrowAmount(reserves);
      console.log(res.toNumber())
      // @ts-ignore
      expect(res.toNumber()).to.be.closeTo(53052.8604, 0.01);
    });

    it('returns right amount with big difference between liquidity pairs', async () => {
      const reserves: OrderedReserves = {
        lowerPricePoolBaseToken: BigNumber.from('1200000000'),
        lowerPricePoolQuoteToken: BigNumber.from('600000'),
        higherPricePoolBaseToken: BigNumber.from('100000'),
        higherPricePoolQuoteToken: BigNumber.from('30')
      };
      const res = calculateBorrowAmount(reserves);
      console.log(res.toNumber())
      // @ts-ignore
      expect(res.toNumber()).to.be.closeTo(8.729, 0.01);
    });

    it('revert with wrong order input', async () => {
      const reserves: OrderedReserves = {
        lowerPricePoolQuoteToken: BigNumber.from('1200000000'),
        lowerPricePoolBaseToken: BigNumber.from('600000'),
        higherPricePoolQuoteToken: BigNumber.from('1000000000'),
        higherPricePoolBaseToken: BigNumber.from('300000')
      };
      await expect(() => calculateBorrowAmount(reserves)).to.throw('Bad solution!');
    });
  });
});
