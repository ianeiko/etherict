const _ = require('lodash');
const when = require('when');
const fs = require('fs');
const TRAINING_DATA = './data/BTC_ETH.json';
const TRADE_FREQUENCY = 1;

const trade = require('./trade');
const orders = require('./orders');
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
        return trade.onData({
          close: data[i].close
        });
      }
    }, 0).then(() => {
      let finalBalance = orders.checkBudget('eth');
      if (finalBalance === 0) {
        finalBalance = parseFloat(orders.checkBudget('btc')) / parseFloat(data[data.length-1].close);
      }
      console.log(`final balance: ${finalBalance}`);
    }).done();
  });
}

// orders.updateBudget({'eth': INITIAL_BALANCE});
orders.updateBudget({'btc': 1});
simulateMonitoring();

module.exports = {
  simulateMonitoring
};
