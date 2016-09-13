const _ = require('lodash');
const when = require('when');
const KrakenClient = require('kraken-api');
const KrakenConfig = require('./kraken-config.js').config;
const kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);
const poll = require('when/poll');

const trade = require('./trade');
const orders = require('./orders');
const INITIAL_BALANCE = 100;

function monitorPrice(){
  return when.promise((resolve, reject, notify) => {
    kraken.api('Ticker', {'pair': 'ETHXBT'}, function(error, data) {
      if(error) console.error(`ERROR: ${error}`);
      try {
        const close = _.get(data, 'result.XETHXXBT.c[0]');
        if(!close) return;
        console.log(`[${new Date()}]: ${close}`)
        trade.onData({
          close: close
        });
        resolve();
      } catch (e) {
        console.error(e);
      }
    });
  });
}

orders.updateBudget({'eth': INITIAL_BALANCE});
poll(monitorPrice, 30 * 1000);

module.exports = {
  monitorPrice
};
