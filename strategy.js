var orders = require('./orders');

function shouldTrade(data) {
  var action;
  action =  Math.round(Math.random()) ? 'buy' : 'sell';

  if(data.close > 0.026) {
    action = 'sell';
  } else if(data.close < 0.022) {
    action = 'buy';
  }

  if(action === 'sell' && data.close < 0.023) action = null;
  if(action === 'buy' && data.close > 0.026) action = null;

  return action;
}

module.exports = {
  shouldTrade
}
