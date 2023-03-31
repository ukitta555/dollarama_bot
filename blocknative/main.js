/*
  Example usage of watchAddress to update reserves on mempool events
*/
import { getSushiSwapInfo } from './getSushiSwapInfo.js'
import { watchAddress } from './watchAddress.js';
import fs from 'fs'
import JSONbig from 'json-bigint';

let initializeFiles = () => {
  if (!fs.existsSync("data.json")) {
    fs.writeFileSync("data.json", "[]")
  }
}

let logReserves = (localReserves, actualReserves) => {
  let data = JSONbig.parse(fs.readFileSync("data.json"))
  data.push({ time: (new Date()).toTimeString(), localReserves, actualReserves })
  fs.writeFileSync("data.json", JSONbig.stringify(data, null, 2))
}

let main = async () => {
  const sushipair = "0x06da0fd433C1A5d7a4faa01111c044910A184553"

  let pairInfo = await getSushiSwapInfo(sushipair);
  let reserves = {}
  reserves[pairInfo.token0] = pairInfo.reserves[0]
  reserves[pairInfo.token1] = pairInfo.reserves[1]

  console.log("Reserves:")
  console.log(reserves)

  initializeFiles()
  watchAddress(sushipair, (reserveChanges) => {
    reserves[pairInfo.token0] = reserves[pairInfo.token0] + BigInt(reserveChanges[pairInfo.token0])
    reserves[pairInfo.token1] = reserves[pairInfo.token1] + BigInt(reserveChanges[pairInfo.token1])
  })

  // Check smart contract reserves every 30 seconds and compare against local reserves, logging the difference to console
  setInterval(async () => {
    let pairInfo = await getSushiSwapInfo(sushipair)
    console.log((new Date()).toTimeString())
    let actualReserves = {}
    actualReserves[pairInfo.token0] = pairInfo.reserves[0]
    actualReserves[pairInfo.token1] = pairInfo.reserves[1]
    console.log(`Actual reserves:`)
    console.log(actualReserves)
    console.log(`Predicted reserves:`)
    console.log(reserves)
    // Check differences between actual and predicted reserves
    let diff = {}
    diff[pairInfo.token0] = actualReserves[pairInfo.token0] - reserves[pairInfo.token0]
    diff[pairInfo.token1] = actualReserves[pairInfo.token1] - reserves[pairInfo.token1]
    console.log(`Difference:`)
    console.log(diff)
    logReserves(reserves, actualReserves)
  }, 1000 * 30)
}

main()