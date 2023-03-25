const BlocknativeSdk = require('bnc-sdk')
const WebSocket = require('ws')
const Web3 = require('web3')

// create options object
const options = {
  dappId: '92377822-5a39-4cbd-b618-c43972b70d2c',
  networkId: 137, // Polygon Matic Mainnet Network
  // networkId: 80001, // Polygon Mumbai Testnet Network
  system: 'ethereum', // optional, defaults to ethereum
  transactionHandlers: [event => console.log(event.transaction)],
  ws: WebSocket, // only neccessary in server environments 
  name: 'Instance name here', // optional, use when running multiple instances
  onerror: (error) => {console.log(error)} //optional, use to catch errors
}

// initialize and connect to the api
const blocknative = new BlocknativeSdk(options)
const sushipair = "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27"

// call with the address of the account that you would like to receive status updates for
const {
  emitter, // emitter object to listen for status updates
  details // initial account details which are useful for internal tracking: address
} = blocknative.account(sushipair)

// register a callback for a txPool event
emitter.on("all", ev => {
  console.log(`event logged: ${ev}`)
})
