var _ = require('lodash');
var when = require('when');
var KrakenClient = require('kraken-api');
var KrakenConfig = require('./kraken-config.js').config;
var kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);
var strategy = require('./strategy');
var orders = require('./orders');

function monitorPrice(){
  kraken.api('Ticker', {'pair': 'ETHXBT'}, function(error, data) {
    if(error) console.error(`ERROR: ${error}`);
    try {
      var close = _.get(data, 'result.XETHXXBT.c[0]');
      if(!close) return;
      onData({
        close: close
      });
    } catch (e) {
      console.error(e);
    }
  });
}

function onData(data){
  when(orders.checkOrders())
      .then(planTrade(data));
}

function planTrade(data){
  var action = strategy.shouldTrade(data);
  console.log(action, data);
  if (action === 'sell') {
    orders.sellAllEth(data);
  } else if(action === 'buy') {
    orders.sellAllBtc(data);
  }
}

orders.updateBudget({'eth': 1000});
setInterval(() => {
  monitorPrice();
}(), 3 * 1000);

