import { Contract } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import { FlashBot } from '../typechain/FlashBot';
import { IWETH } from '../typechain/IWETH';
import {getProfit} from "../bot/getProfit";
import {flashArbitrage} from "../bot/flashArbitrage";
import {BigNumber, utils} from "ethers";

describe('Flashswap', () => {
  let weth: IWETH;
  let flashBot: FlashBot;

  const fabianCoin = '0x1869686c24b3B525A66bDa0866Ab5773B75BdF8a';
  const vladCoin = '0x3d289e88330abf26ca555425be12df4c9fa76508';

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
    uniswapPairAddr = await uniswapFactory.getPair(fabianCoin, vladCoin);
    uniswapPair = new ethers.Contract(uniswapPairAddr, uniPairAbi, waffle.provider);
    sushiswapPairAddr = await pancakeFactory.getPair(fabianCoin, vladCoin);
  });

  beforeEach(async () => {
    // get WBNB contract
    const wethFactory = (await ethers.getContractAt('IWETH', fabianCoin)) as IWETH;
    // access deployed instance of WBNB contract (for some reason named weth...)
    weth = wethFactory.attach(fabianCoin);

    const fbFactory = await ethers.getContractFactory('FlashBotDev');
    // deploy FlashBot contract with WBNB contract address as an argument to the constructor
    flashBot = (await fbFactory.deploy(fabianCoin)) as FlashBot;
  });

  describe('flash swap arbitrage', () => {

    // TODO: flaky tests (order matters since blockchain state gets reused); needs fix;
    it('calculate how much profit we get', async () => {
      [signer] = await ethers.getSigners();
      // transfer 100000 to mdex pair
      const amountEth = ethers.utils.parseEther('100000');
      await weth.deposit({ value: amountEth });
      await weth.transfer(uniswapPairAddr, amountEth);
      await uniswapPair.connect(signer).sync();

      const res = await getProfit(uniswapPairAddr, sushiswapPairAddr);
      console.log(res)
      expect(res.profit).to.be.gt(ethers.utils.parseEther('0'));
      expect(res.baseToken.toLowerCase()).to.be.eq(fabianCoin.toLowerCase());
    });

    it('do flash swap between Pancake and MDEX', async () => {
      // transfer 100000 to mdex pair
      // TODO:
      //   missalignment with getProfit and arbitrage console.log since deposits somehow carry over the tests;
      //   In case you comment out the deposit, getProfit() == profit gained in flashArbitrage;
      //   needs fix;
      const amountEth = ethers.utils.parseEther('100000');
      await weth.deposit({ value: amountEth });
      await weth.transfer(uniswapPairAddr, amountEth);
      await uniswapPair.connect(signer).sync();

      const balanceBefore = await ethers.provider.getBalance(flashBot.address);
      await flashArbitrage(
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
