const _ = require('lodash');
const when = require('when');
const fs = require('fs');
const ubique = require('ubique');
const TRAINING_DATA = './data/BTC_ETH.json';
const TRADE_FREQUENCY = 288; // DAY
// const TRADE_FREQUENCY = 144; // 12 HOURS
// const TRADE_FREQUENCY = 12; // HOUR
// const TRADE_FREQUENCY = 1; // 5 MINUTES

const trade = require('./trade');
const orders = require('./orders');
const history = require('./history');
// const INITIAL_BALANCE = {'eth': 100};
const INITIAL_BALANCE = {'btc': 1};

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
        let close = data[i].close;
        let delta;

        if (i === 0) {
          history.recordInitialPrice(close);
        }

        if (i > 0) {
          let lastMark = data[i - TRADE_FREQUENCY];
          delta = close - lastMark.close;
          history.recordPriceDelta(delta);
        }

        return trade.onData({
          close,
          delta
        });
      }
    }, 0).then(() => {
      reviewResults(data);
    }).done();
  });
}

function reviewResults(data) {
  let finalPrice = parseFloat(data[data.length-1].close);
  let balance = orders.checkBudget();
  if (balance.eth === 0) {
    balance.eth = parseFloat(orders.checkBudget('btc')) / finalPrice;
  } else if (balance.btc === 0) {
    balance.btc = parseFloat(orders.checkBudget('eth')) * finalPrice;
  }
  console.log(`balance: Ξ${balance.eth} === Ƀ${balance.btc}`);

  let profit = Math.floor(((balance.btc - INITIAL_BALANCE.btc) / INITIAL_BALANCE.btc) * 100);
  let bh = INITIAL_BALANCE.btc / history.getInitialPrice();
  bh = Math.floor((((bh * finalPrice) - INITIAL_BALANCE.btc) / INITIAL_BALANCE.btc) * 100);
  console.log(`profit: ${profit}%; b&h: ${bh}%; strategy_over_b&h: ${profit-bh}%`);

  let orderHistory = history.getOrderHistory();
  let totalTrades = orderHistory.length;
  let winningTrades = 0;
  _.each(orderHistory, (order, i) => {
    if (i > 0) {
        let lastOrder = orderHistory[i-1];
        if ((lastOrder.type === 'buy' && lastOrder.price < order.price) ||
            (lastOrder.type === 'sell' && lastOrder.price > order.price)){
          order.winning = true;
          winningTrades++;
        }
    }
    console.log(_.omit(order, ['type', 'volume', 'pair', 'ordertype', 'expiretm', 'validate']));
  });
  let winningPercent = Math.round(winningTrades / (totalTrades-1) * 100); // exclude initial trade
  console.log(`trades: ${totalTrades}; winning: ${winningPercent}%`);

  let priceDeltaHistory = history.getPriceDeltaHistory();
  let MD = ubique.drawdown(priceDeltaHistory);
  console.log(MD.maxdd);
}

orders.updateBudget(INITIAL_BALANCE);
simulateMonitoring();

module.exports = {
  simulateMonitoring
};
