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
import {FlashBotDev} from "../typechain";

describe('Flashswap', () => {
  let weth: IWETH;
  let flashBot: FlashBotDev;

  const testCoin1 = '0xcaf30af12f5bfb687a50ecedcc308170df653f1f';
  const testCoin2 = '0x0D4950B94c2aAA7a500A32387d52438a16424070';

  let signer: SignerWithAddress;

  // ABI of methods we are interested in...
  const uniFactoryAbi = ['function getPair(address, address) view returns (address pair)'];
  const uniPairAbi = ['function sync()'];

  const uniswapFactoryAddr = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
  const uniswapFactory = new ethers.Contract(uniswapFactoryAddr, uniFactoryAbi, waffle.provider);
  let uniswapPairAddr: any;
  let uniswapPair: Contract;

  const sushiswapFactoryAddr = '0xc35DADB65012eC5796536bD9864eD8773aBc74C4';
  const pancakeFactory = new ethers.Contract(sushiswapFactoryAddr, uniFactoryAbi, waffle.provider);
  let sushiswapPairAddr: any;

  before(async () => {
    uniswapPairAddr = await uniswapFactory.getPair(testCoin1, testCoin2);
    uniswapPair = new ethers.Contract(uniswapPairAddr, uniPairAbi, waffle.provider);
    sushiswapPairAddr = await pancakeFactory.getPair(testCoin1, testCoin2);
  });

  beforeEach(async () => {
    // get WBNB contract
    const wethFactory = (await ethers.getContractAt('IWETH', testCoin1)) as IWETH;
    // access deployed instance of WBNB contract (for some reason named weth...)
    weth = wethFactory.attach(testCoin1);

    const fbFactory = await ethers.getContractFactory('FlashBotDev');
    // deploy FlashBot contract with WBNB contract address as an argument to the constructor
    flashBot = (await fbFactory.deploy(testCoin1)) as FlashBotDev;
  });

  describe('flash swap arbitrage', () => {

    // TODO: flaky tests (order matters since blockchain state gets reused); needs fix;
    it('calculate how much profit we get', async () => {
      [signer] = await ethers.getSigners();
      // transfer 10000 to mdex pair
      const amountEth = ethers.utils.parseEther('10000');
      await weth.deposit({ value: amountEth });
      await weth.transfer(uniswapPairAddr, amountEth);
      await uniswapPair.connect(signer).sync();

      const res = await getProfit(
          uniswapPairAddr,
          sushiswapPairAddr,
          isBaseTokenSmallerWeb3,
          getOrderedReserves,
      );
      console.log(res)
      expect(res.profit).to.be.gt(ethers.utils.parseEther('0'));
      expect(res.baseToken.toLowerCase()).to.be.eq(testCoin1.toLowerCase());
    });

    it('do flash swap between Pancake and MDEX', async () => {
      // transfer 10000 to mdex pair
      // TODO:
      //   missalignment with getProfit and arbitrage console.log since deposits somehow carry over the tests;
      //   In case you comment out the deposit, getProfit() == profit gained in flashArbitrage;
      //   needs fix;
      const amountEth = ethers.utils.parseEther('10000');
      await weth.deposit({ value: amountEth });
      await weth.transfer(uniswapPairAddr, amountEth);
      await uniswapPair.connect(signer).sync();

      const balanceBefore = await ethers.provider.getBalance(flashBot.address);
      await flashArbitrage(
          isBaseTokenSmallerWeb3,
          getOrderedReserves,
          uniswapPairAddr,
          sushiswapPairAddr,
          flashBot,
          {
            gasPrice: utils.parseUnits('25', 'gwei'),
            gasLimit: 300000
          }
      );

      // const balanceAfter = await ethers.provider.getBalance(flashBot.address);
      const balanceAfter = await weth.balanceOf(flashBot.address)
      expect(balanceAfter).to.be.gt(balanceBefore);

    });

    it('revert if callback is called from address without permission', async () => {
      await expect(
        flashBot.uniswapV2Call(flashBot.address, ethers.utils.parseEther('1000'), 0, '0xabcd')
      ).to.be.revertedWith('Non permissioned address call');
    });
  });
});
