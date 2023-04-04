import axios from 'axios';
import AsyncLock from 'async-lock';

import config from './config';
import log from './log';

const lock = new AsyncLock();

let ethPrice = 0;

// clear eth price every hour
setInterval(() => {
  lock
    .acquire('bnb-price', () => {
      ethPrice = 0;
      return;
    })
    .then(() => {});
}, 3600000);

export async function getEthPrice(): Promise<number> {
  return await lock.acquire('eth-price', async () => {
    if (ethPrice !== 0) {
      return ethPrice;
    }
    const res = await axios.get(config.ethScanUrl);
    ethPrice = parseFloat(res.data.result.ethusd);
    log.info(`Eth price: $${ethPrice}`);
    return ethPrice;
  });
}
