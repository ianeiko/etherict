var _ = require('lodash');
var when = require('when');
var poll = require('when/poll');
var KrakenClient = require('kraken-api');
var KrakenConfig = require('./kraken-config.js').config;
var kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);
var strategy = require('./strategy');
var orders = require('./orders');

const INITIAL_BALANCE = 1000;

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
poll(monitorPrice, 3 * 1000);
