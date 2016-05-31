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
  greatestDelta: 0,
  tailingDelta: 0,
  last: 0,
  delta: 0
}

function updateState(last){
  var delta = (state.bid - last).toFixed(6);
  var newState = {
    last: last,
    delta: delta,
    aboveBid: (last >= state.bid)
  }
  if(state.greatestDelta < delta) {
    logMsg(`price at: ${state.last}, new greatestDelta: ${delta}`);
    newState.greatestDelta = delta;
  }
  if(state.greatestDelta > 0) {
    newState.tailingDelta = ((delta - (newState.greatestDelta || state.greatestDelta)) / last).toFixed(6);
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
    logMsg(`price at: ${state.last}, price delta: ${state.delta}`);
  }

  if (state.follow && state.tailingDelta > 0) {
    logMsg(`${state.tailingDelta} since greatestDelta: ${state.greatestDelta}`);
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
