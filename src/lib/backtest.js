const _ = require('lodash');
const when = require('when');
const fs = require('fs');

const trade = require('./trade');
const orders = require('./orders');
const HistoryClass = require('./history');
const StrategyClass = require('./strategy');
const review = require('./review');

const TRAINING_DATA = './data/BTC_ETH.json';
const INITIAL_BALANCE = { btc: 1, eth: 0 };

function readBacktestData(options) {
  return when.promise((resolve, reject) => {
    fs.readFile(TRAINING_DATA, (err, data) => {
      if(err) throw err;
      data = JSON.parse(data);

      let history = new HistoryClass({
        initialBalance: INITIAL_BALANCE,
        initialPrice: data[0].close
      });
      let strategy = new StrategyClass(options, history);
      let reviewResults = () => resolve(review.reviewResults(data, history, options));

      orders.reset();
      orders.updateBudget(INITIAL_BALANCE);

      return when.iterate(x => x + 1,
        x => x >= data.length,
        x => simulate(strategy, options, history, data, x), 0)
        .done(reviewResults);
    });
  });
}

function simulate(strategy, options, history, data, i) {
  if (i % options.frequency === 0 && i > 0) {
    let close = data[i].close;
    let lastMark = data[i - options.frequency];
    let delta = (close - lastMark.close) / lastMark.close;

    return trade.onData(
      strategy,
      { close, delta },
      history
    );
  }
}

module.exports = {
  readBacktestData
};
