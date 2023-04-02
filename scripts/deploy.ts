import { ethers, run } from 'hardhat';

import process from 'node:process';

const baseTokenAddr: string = '0x1869686c24b3B525A66bDa0866Ab5773B75BdF8a';

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
