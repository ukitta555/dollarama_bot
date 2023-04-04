import { ethers } from 'hardhat';
import {BigNumber, ContractReceipt, ContractTransaction} from 'ethers';
import AsyncLock from 'async-lock';
import { getEthPrice } from './basetoken-price';
import log from './log';
import config from './config';
import {getProfit} from "./getProfit";
import {flashArbitrage} from "./flashArbitrage";
import {isBaseTokenSmallerFuncType, OrderedReservesEnhanced} from './types';
import {FlashBotDev} from "../typechain";


// function sleep(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

async function calcNetProfit(profitWei: BigNumber, address: string, baseTokens: Tokens): Promise<number> {
  let price = 1;
  if (baseTokens.weth_fabian.address == address) {
    price = await getEthPrice();
  }
  let profit = parseFloat(ethers.utils.formatEther(profitWei));
  profit = profit * price;

  const gasCost = price * parseFloat(ethers.utils.formatEther(config.gasPrice)) * (config.gasLimit as number);
  // const gasCost = 0
  log.debug(`${profit}, ${gasCost} `)
  return profit - gasCost;
}

// Promise.all(arbitrageFunc, arbitrageFunc, arbitrageFunc)
async function arbitrageFunc(
    flashBot: FlashBotDev,
    baseTokens: Tokens,
    isBaseTokenSmallerFunc: isBaseTokenSmallerFuncType,
    getOrderedReservesFunc:
        (pool0: string, pool1: string, isBaseTokenSmaller: boolean) =>
            Promise<OrderedReservesEnhanced>,
    pair: ArbitragePair
) {
  const lock = new AsyncLock({ timeout: 2000, maxPending: 20 });

  const [pair0, pair1] = pair.pairs;

  let res: {
    profit: BigNumber;
    baseToken: string;
  };
  // get gross profit based on current state of DEXes
  try {
    res = await getProfit(
        pair0,
        pair1,
        isBaseTokenSmallerFunc,
        getOrderedReservesFunc,
    )
    // console.log(`Profit on ${pair.symbols}: ${ethers.utils.formatEther(res.profit)}`)
    log.debug(`Profit on ${pair.symbols}: ${ethers.utils.formatEther(res.profit)}`);
  } catch (err) {
    log.debug(err);
    return;
  }

  if (res.profit.gt(BigNumber.from('0'))) {
    // account for gas
    const netProfit = await calcNetProfit(res.profit, res.baseToken, baseTokens);
    log.debug(`Net profit: ${netProfit}`)
    // in case the net profit is less than we want it to be, we have to abort
    if (netProfit < config.minimumProfit) {
      return;
    }

    // otherwise, we are making money, so perform arbitrage
    log.info(`Calling flash arbitrage, net profit: ${netProfit}`);
    try {
      // lock to prevent tx nonce overlap
      await lock.acquire('flash-bot', async () => {
        const response: ContractTransaction = await flashArbitrage(
            isBaseTokenSmallerFunc,
            getOrderedReservesFunc,
            pair0,
            pair1,
            flashBot,
            {
              gasPrice: config.gasPrice,
              gasLimit: config.gasLimit,
              // nonce: 191
            });
        console.log("Tx hash: ", response.hash);
        const receipt: ContractReceipt = await response.wait();
        log.info(`Tx: ${receipt.transactionHash} `);
      });
    } catch (err: any) {
      if (err.message === 'Too much pending tasks' || err.message === 'async-lock timed out') {
        return;
      }
      log.error(err);
    }
  }
}


// async function main() {
//   const pairs = await tryLoadPairs(Network.ETH_TESTNET);
//   const flashBot = (await ethers.getContractAt('FlashBotDev', config.contractAddr)) as FlashBot;
//   const [baseTokens] = getTokens(Network.ETH_TESTNET);
//
//   log.info('Start arbitraging');
//   while (true) {
//     await pool({
//       collection: pairs,
//       task: arbitrageFunc(flashBot, baseTokens, isBaseTokenSmallerWeb3, getOrderedReserves),
//       // maxConcurrency: config.concurrency,
//     });
//     await sleep(1000);
//   }
// }

// main()
//   .then(() => process.exit(0))
//   .catch((err) => {
//     log.error(err);
//     process.exit(1);
//   });

export {arbitrageFunc}