const _ = require('lodash');
const moment = require('moment');
const fs = require('fs');
const ubique = require('ubique');
const json2csv = require('json2csv');
const RESULTS_FILE = './data/results.csv';

function reviewResults(data, history, orders, options) {
  const finalPrice = parseFloat(data[data.length - 1].close);
  const balance = orders.checkBudget();
  const initialBalance = history.getInitialBalance();
  if (balance.eth === 0) {
    balance.eth = parseFloat(orders.checkBudget('btc')) / finalPrice;
  } else if (balance.btc === 0) {
    balance.btc = parseFloat(orders.checkBudget('eth')) * finalPrice;
  }
  console.log(`balance: Ξ${balance.eth} === Ƀ${balance.btc}`);

  const profit = Math.floor(((balance.btc - initialBalance.btc) / initialBalance.btc) * 100);
  let bh = initialBalance.btc / history.getInitialPrice();
  bh = Math.floor((((bh * finalPrice) - initialBalance.btc) / initialBalance.btc) * 100);
  const strategy_over_bh = profit - bh;
  console.log(`profit: ${profit}%; b&h: ${bh}%; strategy_over_b&h: ${strategy_over_bh}%`);

  const orderHistory = history.getOrderHistory();
  const totalTrades = orderHistory.length;
  let winningTrades = 0;
  _.each(orderHistory, (order, i) => {
    if (i > 0) {
        const lastOrder = orderHistory[i - 1];
        if ((lastOrder.type === 'buy' && lastOrder.price < order.price) ||
            (lastOrder.type === 'sell' && lastOrder.price > order.price)) {
          order.winning = true;
          winningTrades++;
        }
    }
    console.log(_.omit(order, ['type', 'volume', 'pair', 'ordertype', 'expiretm', 'validate']));
  });
  const winningPercent = Math.round(winningTrades / (totalTrades - 1) * 100); // exclude initial trade
  console.log(`trades: ${totalTrades}; winning: ${winningPercent}%`);

  const priceDeltaHistory = history.getPriceDeltaHistory();
  let mdd = ubique.drawdown(priceDeltaHistory);
  mdd = Math.round(mdd.maxdd * 10000) / 100;

  const time = moment().format('l::HH:MM');
  const jsonData = {
    time,
    month: options.month,
    stoploss: options.stoploss,
    system: options.system,
    period: options.period.toString(),
    balance_1: `Ξ${balance.eth}`,
    balance_2: `Ƀ${balance.btc}`,
    mdd: `${mdd}%`,
    profit: `${profit}%`,
    bh: `${bh}%`,
    strategy_over_bh: `${strategy_over_bh}%`,
    trades: totalTrades,
    winning: `${winningPercent}%`
  };
  const jsonFields = [
    'time',
    'month',
    'stoploss',
    'system',
    'period',
    'balance_1',
    'balance_2',
    'mdd',
    'profit',
    'bh',
    'strategy_over_bh',
    'trades',
    'winning'
  ];

  if (process.env.NODE_ENV === 'test') return jsonData;
  fs.stat(RESULTS_FILE, (err) => {
    if (err) {
      fs.writeFile(RESULTS_FILE, json2csv({ data: jsonData, fields: jsonFields }));
    } else {
      fs.appendFile(RESULTS_FILE, '\n' + json2csv({ data: jsonData, hasCSVColumnTitle: false }));
    }
  });
}

module.exports = {
  reviewResults
};
