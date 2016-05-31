var KrakenClient = require('kraken-api');
var KrakenConfig = require('./kraken-config.js').config;
var kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);
var strategy = require('./strategy');
var orders = require('./orders');

function monitorPrice(){
  kraken.api('Ticker', {'pair': 'ETHXBT'}, function(error, data) {
    if(error) console.error(`ERROR: ${error}`);
    var close = data.result['XETHXXBT']['c'][0];
    onData({
      close: close
    });
  });
}

function onData(data){
  var action = strategy.shouldTrade(data);
  console.log(action, data);
  if (action === 'sell') {
    orders.sellAllEth(data);
  } else if(action === 'buy') {
    orders.sellAllBtc(data);
  }
}

orders.updateBudget({'eth': 100});
monitorPrice();
// setInterval(() => {
//   monitorPrice();
// }(), 30 * 1000);