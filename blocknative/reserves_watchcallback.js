//Test Funciton
const watchAddressTest = async (address, callback) => {
    setInterval(_ => {
    const changes = new Map
    changes.set('btc', 1)
    changes.set('usd', 1)
    callback(changes, address);
    console.log(reserves_example)
    }, 2000)
    }
    
 //Test data   
const reserves_example = new Map//<string, Map<string, number>>;
const pair1 = new Map
pair1.set('btc', BigInt(0))
pair1.set('usd', BigInt(0))
reserves_example.set('pool', pair1)
console.log(reserves_example)
    
const WatchCallback = (changes, pool_address) => {
    let pair = new Map
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
    
}
watchAddressTest('pool', WatchCallback);


