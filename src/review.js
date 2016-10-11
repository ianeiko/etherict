const _ = require('lodash');
const moment = require('moment');
const fs = require('fs');
const ubique = require('ubique');
const json2csv = require('json2csv');
const csv = require('fast-csv');
const orders = require('./orders');
const strategy = require('./strategy');
const RESULTS_FILE = './data/results.csv';

function reviewResults(data, history, options) {
  let finalPrice = parseFloat(data[data.length-1].close);
  let balance = orders.checkBudget();
  let initialBalance = history.getInitialBalance();
  if (balance.eth === 0) {
    balance.eth = parseFloat(orders.checkBudget('btc')) / finalPrice;
  } else if (balance.btc === 0) {
    balance.btc = parseFloat(orders.checkBudget('eth')) * finalPrice;
  }
  console.log(`balance: Ξ${balance.eth} === Ƀ${balance.btc}`);

  let profit = Math.floor(((balance.btc - initialBalance.btc) / initialBalance.btc) * 100);
  let bh = initialBalance.btc / history.getInitialPrice();
  bh = Math.floor((((bh * finalPrice) - initialBalance.btc) / initialBalance.btc) * 100);
  let strategy_over_bh = profit-bh;
  console.log(`profit: ${profit}%; b&h: ${bh}%; strategy_over_b&h: ${strategy_over_bh}%`);

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
  // console.log('priceDeltaHistory', priceDeltaHistory);
  let MD = ubique.drawdown(priceDeltaHistory);
  // console.log(MD.maxdd);

  let time = moment().format('l::HH:MM');
  let jsonData = {
    time,
    strategy: options.strategy,
    period: options.period.toString(),
    balance_1: `Ξ${balance.eth}`,
    balance_2: `Ƀ${balance.btc}`,
    profit: `${profit}%`,
    bh: `${bh}%`,
    strategy_over_bh: `${strategy_over_bh}%`,
    trades: totalTrades,
    winning: `${winningPercent}%`
  }
  let jsonFields = ['time', 'strategy', 'period', 'balance_1', 'balance_2', 'profit', 'bh', 'strategy_over_bh', 'trades', 'winning'];

  fs.stat(RESULTS_FILE, (err) => {
    if (err) {
      fs.writeFile(RESULTS_FILE, json2csv({data: jsonData, fields: jsonFields}));
    } else {
      fs.appendFile(RESULTS_FILE, '\n' + json2csv({data: jsonData, hasCSVColumnTitle: false}));
    }
  });
}

module.exports = {
  reviewResults
}
