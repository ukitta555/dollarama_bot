import {getProfit} from "./watchcallback_utils.js"
// const { values } = require("lodash")
//Test Funciton
const watchAddressTest = async (address, callback) => {
    setInterval(_ => {
    const changes = new Map
    changes.set('0x2a', 1)
    changes.set('0x2b', 1)
    callback(changes, address);
    console.log(reserves_example)
    }, 2000)
    }
    
 //Test data   
const reserves_example = new Map()//<string, Map<string, number>>;
const pair1 = new Map()
const pair2 = new Map()
pair1.set('0x2a', BigInt(0))
pair1.set('0x2b', BigInt(0))
pair2.set('0x2a', BigInt(1))
pair2.set('0x2b', BigInt(1))
reserves_example.set('pool1', pair1)
reserves_example.set('pool2', pair2)
console.log(reserves_example)
    

const WatchCallback = (changes, pool_address) => {
    let pair = new Map()
    if (reserves_example.has(pool_address)){
        pair = reserves_example.get(pool_address);
    }
    else return -1;
    for (const address of changes.keys()) {
        const delta = BigInt(changes.get(address));
        if (pair?.has(address)){
            pair?.set(address, BigInt(pair?.get(address)) + BigInt(delta))
        }
        else {
            console.log('No token address:', address);
            return -2;
        }
        reserves_example.set(pool_address, pair);
    }
    if (getProfit(reserves_example.get('pool2'), reserves_example.get('pool1'))>0){
        console.log('profit!')
    }
    
}
watchAddressTest('pool1', WatchCallback);

// {
//     pool1:{
//         token1: value,
//         token2: value
//     },
//     pool2:{
//         token1: value,
//         token2: value
//     }
// }


// {
//     (token1, token2): pool
// }