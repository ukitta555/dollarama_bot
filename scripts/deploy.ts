import { ethers, run } from 'hardhat';

import process from 'node:process';

const baseTokenAddr: string = '0xcaF30Af12f5BFb687a50eCeDcC308170DF653F1f';

async function main() {
  await run('compile');
  const FlashBot = await ethers.getContractFactory('FlashBotDev');
  const flashBot = await FlashBot.deploy(baseTokenAddr);

  console.log(`FlashBot deployed to ${flashBot.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
