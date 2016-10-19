const _ = require('lodash');
const when = require('when');
const fs = require('fs');

const trade = require('./trade');
const OrdersClass = require('./orders');
const HistoryClass = require('./history');
const StrategyClass = require('./strategy');
const review = require('./review');

const TRAINING_DATA = './data/BTC_ETH';
const INITIAL_BALANCE = { btc: 1, eth: 0 };

function readBacktestData(options) {
  return when.promise((resolve, reject) => {
    const fileName = getFileName(options);
    console.log('reading file: ', fileName);
    fs.readFile(fileName, (err, data) => {
      if(err) reject(err);
      data = JSON.parse(data);

      const history = new HistoryClass({
        initialBalance: INITIAL_BALANCE,
        initialPrice: data[0].close
      });
      const strategy = new StrategyClass(options, history);
      const orders = new OrdersClass({
        initialBalance: INITIAL_BALANCE
      });
      const reviewResults = () => resolve(review.reviewResults(data, history, orders, options));

      return when.iterate(x => x + 1,
        x => x >= data.length,
        x => simulate(x, data, history, orders, strategy, options), 0)
        .done(reviewResults);
    });
  });
}

function simulate(i, data, history, orders, strategy, options) {
  if (i % options.frequency === 0 && i > 0) {
    const close = data[i].close;
    const lastMark = data[i - options.frequency];
    const delta = (close - lastMark.close) / lastMark.close;

    return trade.onData(
      { close, delta },
      history,
      orders,
      strategy
    );
  }
}

function getFileName(options) {
  let result = TRAINING_DATA;
  if (options.month) {
    result = `${result}_${options.month}`;
  }
  return `${result}.json`;
}

module.exports = {
  readBacktestData
};
