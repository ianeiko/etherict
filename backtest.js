var fs = require('fs');
var strategy = require('./strategy');
var orders = require('./orders');

const TRAINING_DATA = './data/BTC_ETH.json';
const TRADE_FREQUENCY = 30;

function simulateMonitoring(){
  fs.readFile(TRAINING_DATA, (err, data) => {
    if(err) throw err;

    data = JSON.parse(data);
    for (var i = 0; i < data.length; i++) {
      if (i % TRADE_FREQUENCY === 0){
        onData(data[i]);
      }
    }
    orders.sellAllBtc(data[data.length-1]);
    var growth = Math.round(orders.checkBudget('eth') - 100);
    console.log('%' + growth)
  });
}

function onData(data){
  var action = strategy.shouldTrade(data);
  if (action === 'sell') {
    orders.sellAllEth(data);
  } else if(action === 'buy') {
    orders.sellAllBtc(data);
  }
}

orders.updateBudget({'eth': 100});
simulateMonitoring();
