import { Contract } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers, waffle } from 'hardhat';
import { FlashBot } from '../typechain/FlashBot';
import { IWETH } from '../typechain/IWETH';
import {getProfit} from "../bot/getProfit";
import {flashArbitrage} from "../bot/flashArbitrage";
import {BigNumber} from "ethers";

describe('Flashswap', () => {
  let weth: IWETH;
  let flashBot: FlashBot;

  const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
  const USDT = '0x55d398326f99059ff775485246999027b3197955';

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
    mdexPair = new ethers.Contract(mdexPairAddr, uniPairAbi, waffle.provider);
    pancakePairAddr = await pancakeFactory.getPair(WBNB, USDT);
  });

  beforeEach(async () => {
    // get WBNB contract
    const wethFactory = (await ethers.getContractAt('IWETH', WBNB)) as IWETH;
    // access deployed instance of WBNB contract (for some reason named weth...)
    weth = wethFactory.attach(WBNB);

    const fbFactory = await ethers.getContractFactory('FlashBotDev');
    // deploy FlashBot contract with WBNB contract address as an argument to the constructor
    flashBot = (await fbFactory.deploy(WBNB)) as FlashBot;
  });

  describe('flash swap arbitrage', () => {

    // TODO: flaky tests (order matters since blockchain state gets reused); needs fix;
    it('calculate how much profit we get', async () => {
      // transfer 100000 to mdex pair
      const amountEth = ethers.utils.parseEther('100000');
      await weth.deposit({ value: amountEth });
      await weth.transfer(mdexPairAddr, amountEth);
      await mdexPair.connect(signer).sync();

      const res = await getProfit(mdexPairAddr, pancakePairAddr);
      console.log(res)
      expect(res.profit).to.be.gt(ethers.utils.parseEther('500'));
      expect(res.baseToken).to.be.eq(WBNB);
    });

    it('do flash swap between Pancake and MDEX', async () => {
      // transfer 100000 to mdex pair
      // TODO:
      //   missalignment with getProfit and arbitrage console.log since deposits somehow carry over the tests;
      //   In case you comment out the deposit, getProfit() == profit gained in flashArbitrage;
      //   needs fix;
      const amountEth = ethers.utils.parseEther('100000');
      await weth.deposit({ value: amountEth });
      await weth.transfer(mdexPairAddr, amountEth);
      await mdexPair.connect(signer).sync();

      const balanceBefore = await ethers.provider.getBalance(flashBot.address);
      await flashArbitrage(
          mdexPairAddr,
          pancakePairAddr,
          flashBot,
          {
            gasPrice: BigNumber.from("121660481"),
            gasLimit: 300000
          }
      );


      const balanceAfter = await ethers.provider.getBalance(flashBot.address);

      expect(balanceAfter).to.be.gt(balanceBefore);

    });

    it('revert if callback is called from address without permission', async () => {
      await expect(
        flashBot.uniswapV2Call(flashBot.address, ethers.utils.parseEther('1000'), 0, '0xabcd')
      ).to.be.revertedWith('Non permissioned address call');
    });
  });
});
