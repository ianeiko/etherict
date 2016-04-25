var KrakenClient = require('kraken-api');
var KrakenConfig = require('./kraken-config.js').config;
var kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);
var fs = require('fs');

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
    logMsg(`=== new greatestChange: ${change} ===`);
    newState.greatestChange = change;
  }
  if(state.greatestChange > 0) {
    newState.tailingChange = ((change - (newState.greatestChange || state.greatestChange)) / last).toFixed(6)
  }
  state = Object.assign({}, state, newState);
}

function startFollowing(){
  if(state.follow) return;
  logMsg(`=== price has crossed bid threshold! ===`);
  state.follow = true;
}

function stopFollowing(){
  if(!state.follow) return;
  logMsg(`=== price is above bid again! ===`);
  state.follow = false;
}

function logMsg(msg){
  fs.appendFile('log.txt', `[${new Date()}]: ${msg}\n`);
}

function monitorPrice(){
  kraken.api('Ticker', {'pair': 'ETHXBT'}, function(error, data) {
      if(error) throw error;

      var last = data.result['XETHXXBT']['b'][0];
      last = parseFloat(last);
      updateState(last);

      if (state.aboveBid) {
        stopFollowing();
        logMsg(`+++ price at: ${state.last}, above bid: ${state.change} +++`);
      }

      if (!state.aboveBid) {
        startFollowing();
        logMsg(`--- price at: ${state.last}, below bid: ${state.change} ---`);
      }

      if (state.follow && state.tailingChange > 0) {
        logMsg(`=== ${state.tailingChange}% up since greatestChange: ${state.greatestChange} ===`);
      }
  });
}

monitorPrice();
setInterval(() => {
  monitorPrice();
}, 60 * 1000);
