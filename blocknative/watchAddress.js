/*
  watchAddress lets you register a callback function that will be called whenever a reserve change is detected
  on a pool address. See main.js for example usage

  calls the callback with the following object as a parameter:
  {
    token 0 address: token 0 change,
    token 1 address: token 1 change
  }
*/
import BlocknativeSdk from 'bnc-sdk'
import WebSocket from 'ws'
import { getSushiSwapInfo } from './getSushiSwapInfo.js'
import fs from 'fs'
import JSONbig from 'json-bigint';

let logEvent = (ev) => {
  if (!fs.existsSync("events.json")) {
    fs.writeFileSync("events.json", "[]")
  }
  let data = JSONbig.parse(fs.readFileSync("events.json"))
  data.push(ev)
  fs.writeFileSync("events.json", JSONbig.stringify(data, null, 2))
}

const options = {
  dappId: '92377822-5a39-4cbd-b618-c43972b70d2c',
  networkId: 1, // Ethereum Mainnet Network
  // networkId: 137, // Polygon Matic Mainnet Network
  // networkId: 80001, // Polygon Mumbai Testnet Network
  system: 'ethereum', // optional, defaults to ethereum
  transactionHandlers: [ev => logEvent(ev)],
  ws: WebSocket, // only neccessary in server environments 
  name: 'Instance name here', // optional, use when running multiple instances
  onerror: (error) => { console.log(error) } //optional, use to catch errors
}

let simulatedTx = []

let extractReserveChanges = (ev, pairAddress, token0Address, token1Address) => {
  let reserveChanges = ev.netBalanceChanges.filter(change => change.address == pairAddress)[0]

  if (reserveChanges == undefined) {
    return { token0change: 0, token1change: 0 }
  }

  let token0changeObject = reserveChanges.balanceChanges.filter(change => change.asset.contractAddress.toUpperCase() == token0Address.toUpperCase())[0]
  let token1changeObject = reserveChanges.balanceChanges.filter(change => change.asset.contractAddress.toUpperCase() == token1Address.toUpperCase())[0]

  if (token0changeObject == undefined || token1changeObject == undefined) {
    return { token0change: 0, token1change: 0 }
  }

  // Get balance changes
  let token0change = BigInt(token0changeObject.delta)
  let token1change = BigInt(token1changeObject.delta)
  return { token0change, token1change }
}

let handleEvent = (ev, pairAddress, pairinfo, log = true) => {
  // Serialize events as JSON into file "events.json"
  let events = JSON.parse(fs.readFileSync("events.json"))
  events.push(ev)
  fs.writeFileSync("events.json", JSON.stringify(events, null, 2))

  // Handle simulated transactions
  if (ev.eventCode == "txPoolSimulation") {
    if (log) console.log(`${(new Date()).toTimeString()} Simulated transaction: ${ev.hash}`)
    simulatedTx.push(ev.hash)
  }
  if (ev.eventCode == "txConfirmed") {
    if (log) console.log(`${(new Date()).toTimeString()} Confirmed transaction: ${ev.hash}`)
    // Simulated transaction confirmed, changes to reserves already registered
    if (simulatedTx.includes(ev.hash)) {
      simulatedTx.splice(simulatedTx.indexOf(ev.hash), 1)
      return { token0change: 0, token1change: 0 }
    }
  }
  if (ev.eventCode == "txFailed" && simulatedTx.includes(ev.hash)) {
    if (log) console.log(`${(new Date()).toTimeString()} Failed transaction: ${ev.hash}`)
    // Simulated transaction failed, changes to reserves need to be reverted
    simulatedTx.splice(simulatedTx.indexOf(ev.hash), 1)
    if (ev.hasOwnProperty("netBalanceChanges")) {
      let { token0change, token1change } = extractReserveChanges(ev, pairAddress, pairinfo.token0, pairinfo.token1)
      if (log) console.log("\tΔ Token 0: " + (-1) * token0change)
      if (log) console.log("\tΔ Token 1: " + (-1) * token1change)
      return { token0change: -1 * token0change, token1change: -1 * token1change }
    }
    return { token0change: 0, token1change: 0 }
  }

  // Handle reserve changes
  if (ev.hasOwnProperty("netBalanceChanges")) {
    let { token0change, token1change } = extractReserveChanges(ev, pairAddress, pairinfo.token0, pairinfo.token1)
    if (log) console.log("\tΔ Token 0: " + token0change)
    if (log) console.log("\tΔ Token 1: " + token1change)
    return { token0change, token1change }
  }
  return { token0change: 0, token1change: 0 }
}

// Watch for events on specific address, call callback using reserve changes
let watchAddress = async (address, callback, log = true) => {
  // initialize and connect to the api
  const blocknative = new BlocknativeSdk(options)

  // call with the address of the account that you would like to receive status updates for
  const {
    emitter, // emitter object to listen for status updates
    details // initial account details which are useful for internal tracking: address
  } = blocknative.account(address)

  if (log) console.log(`Watching: ${details.address}`)

  // Get info
  let pairInfo = await getSushiSwapInfo(address);

  // Register event listener, call callback with reserve changes
  emitter.on("all", ev => {
    let { token0change, token1change } = handleEvent(ev, address, pairInfo, log);
    let changesObj = {}
    changesObj[pairInfo.token0] = token0change
    changesObj[pairInfo.token1] = token1change
    callback(changesObj)
  })
}

// Example usage
let example = () => {
  watchAddress("0x06da0fd433C1A5d7a4faa01111c044910A184553", (reserveChanges) => {
    console.log("0x06da0fd433C1A5d7a4faa01111c044910A184553:")
    console.log(reserveChanges)
  })

  watchAddress("0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009", (reserveChanges) => {
    console.log("0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009:")
    console.log(reserveChanges)
  })
}

export { watchAddress };