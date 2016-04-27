var KrakenClient = require('kraken-api');
var KrakenConfig = require('./kraken-config.js').config;
var kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);
var fs = require('fs');

const USE_LIVE_API = false;
const NOISY_LOGS = false;
const TRAINING_DATA = './data/BTC_ETH.json';

var state = {
  bid: 0.016447, // $7.532726
  aboveBid: true,
  follow: false,
  greatestChange: 0,
  tailingChange: 0,
  last: 0,
  change: 0
}

function updateState(last){
  var change = (state.bid - last).toFixed(6);
  var newState = {
    last: last,
    change: change,
    aboveBid: (last >= state.bid)
  }
  if(state.greatestChange < change) {
    logMsg(`price at: ${state.last}, new greatestChange: ${change}`);
    newState.greatestChange = change;
  }
  if(state.greatestChange > 0) {
    newState.tailingChange = ((change - (newState.greatestChange || state.greatestChange)) / last).toFixed(6);
  }
  if(!state.follow && newState.aboveBid){
    newState.follow = true;
    logMsg(`price at: ${state.last}, has crossed bid threshold!`);
  }
  if(state.follow && !newState.aboveBid){
    newState.follow = false;
    logMsg(`price at: ${state.last}, above bid again!`);
  }
  state = Object.assign({}, state, newState);
}

function logInfo(){
  if(NOISY_LOGS){
    logMsg(`price at: ${state.last}, price change: ${state.change}`);
  }

  if (state.follow && state.tailingChange > 0) {
    logMsg(`${state.tailingChange} since greatestChange: ${state.greatestChange}`);
  }
}

function logMsg(msg){
  if(USE_LIVE_API) {
    msg = `[${new Date()}]: ${msg}`;
    fs.appendFile('log.txt', `${msg}\n`);
  }
  console.log(msg);
}

function monitorPrice(){
  kraken.api('Ticker', {'pair': 'ETHXBT'}, function(error, data) {
      if(error) logMsg(`ERROR: ${error}`);

      var last = data.result['XETHXXBT']['b'][0];
      last = parseFloat(last);
      updateState(last);
      logInfo();
  });
}

function simulateMonitoring(){
  fs.readFile(TRAINING_DATA, (err, data) => {
    if(err) throw err;

    data = JSON.parse(data);
    for (var item of data) {
      updateState(item.close);
      logInfo();
    }
  });
}

if(USE_LIVE_API) {
  setInterval(() => {
    monitorPrice();
  }(), 60 * 1000);
} else {
  simulateMonitoring();
}
