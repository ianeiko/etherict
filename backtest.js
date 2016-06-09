var _ = require('lodash');
var when = require('when');
var fs = require('fs');
var strategy = require('./strategy');
var orders = require('./orders');

const TRAINING_DATA = './data/BTC_ETH.json';
const TRADE_FREQUENCY = 30;
const INITIAL_BALANCE = 100;

function simulateMonitoring(){
  fs.readFile(TRAINING_DATA, (err, data) => {
    if(err) throw err;

    data = JSON.parse(data);
    when.iterate(function(i) {
      return i+1;
    }, function(i) {
      return i >= data.length;
    }, function(i) {
      if (i % TRADE_FREQUENCY === 0){
        onData({
          close: data[i].close
        });
      }
    }, 0).then(() => {
      var finalBalance = orders.checkBudget('eth');
      if (finalBalance === 0) {
        finalBalance = parseFloat(orders.checkBudget('btc')) / parseFloat(data[data.length-1].close);
      }
      console.log(`final balance: ${finalBalance}`);
    }).done();
  });
}

function onData(data){
  when(orders.checkOrders())
      .then(planTrade(data));
}

function planTrade(data){
  var action = strategy.shouldTrade(data);
  var result;
  if (action === 'sell') {
    result = orders.sellAllEth(data);
  } else if(action === 'buy') {
    result = orders.sellAllBtc(data);
  }
  return when(result);
}

orders.updateBudget({'eth': INITIAL_BALANCE});
simulateMonitoring();