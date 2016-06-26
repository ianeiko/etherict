var _ = require('lodash');
var when = require('when');
if (process.env.BACKTESTING) {
  var fs = require('fs');
  const TRAINING_DATA = './data/BTC_ETH.json';
  const TRADE_FREQUENCY = 10;
} else {
  var KrakenClient = require('kraken-api');
  var KrakenConfig = require('./kraken-config.js').config;
  var kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);
  var poll = require('when/poll');
}
var strategy = require('./strategy');
var orders = require('./orders');
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
        return onData({
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

function monitorPrice(){
  return when.promise((resolve, reject, notify) => {
    kraken.api('Ticker', {'pair': 'ETHXBT'}, function(error, data) {
      if(error) console.error(`ERROR: ${error}`);
      try {
        var close = _.get(data, 'result.XETHXXBT.c[0]');
        if(!close) return;
        console.log(`[${new Date()}]: ${close}`)
        onData({
          close: close
        });
        resolve();
      } catch (e) {
        console.error(e);
      }
    });
  });
}

function onData(data){
  return when(orders.checkOrders())
            .then(() => {
              return strategy.shouldTrade(data)
            })
            .then(action => {
              return planTrade(data, action);
            })
            .then(order => {
              return (order) ? orders.placeOrder(order) : false;
            })
            .catch(err => {
              console.error(err);
            });
}

function planTrade(data, action){
  if (action === 'sell') {
    return orders.createSellAllEthOrder(data);
  } else if(action === 'buy') {
    return orders.createSellAllBtcOrder(data);
  }
}

orders.updateBudget({'eth': INITIAL_BALANCE});
if (process.env.BACKTESTING) {
  simulateMonitoring();
} else {
  poll(monitorPrice, 3 * 1000);
}