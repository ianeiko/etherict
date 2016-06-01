var orders = require('./orders');

function shouldTrade(data) {
  var action;
  action =  Math.round(Math.random()) ? 'buy' : 'sell';

  if(data.close > 0.03) {
    action = 'sell';
  } else if(data.close < 0.021) {
    action = 'buy';
  }

  // if(action === 'sell' && data.close < 0.021) action = null;
  // if(action === 'buy' && data.close > 0.03) action = null;

  return action;
}

module.exports = {
  shouldTrade
}
