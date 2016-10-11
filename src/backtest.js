/*
////////////////////////////////////

npm run backtest -- --strategy=sma --period=9,26 --frequency=288

frequency:
1 = 5 MINUTES
12 = 1 HOUR
144 = 12 HOURS
288 = DAY

////////////////////////////////////
*/

const _ = require('lodash');
const when = require('when');
const fs = require('fs');

const trade = require('./trade');
const orders = require('./orders');
const HistoryClass = require('./history');
const StrategyClass = require('./strategy');
const review = require('./review');

const TRAINING_DATA = './data/BTC_ETH.json';
const INITIAL_BALANCE = {btc: 1, eth: 0};

function simulateMonitoring(options){
  return when.promise((resolve, reject) => {
    let history = new HistoryClass();
    let strategy = new StrategyClass(options, history);

    orders.reset();
    orders.updateBudget(INITIAL_BALANCE);

    fs.readFile(TRAINING_DATA, (err, data) => {
      if(err) throw err;

      data = JSON.parse(data);
      return when.iterate(x => x+1,
        x => x >= data.length,
        x => simulate(strategy, options, history, data, x), 0)
        .done(() => {
          return resolve(review.reviewResults(data, history, options));
        });
    });
  });
}

function simulate(strategy, options, history, data, i) {
  if (i % options.frequency === 0){
    let close = data[i].close;
    let delta;

    if (i === 0) {
      history.recordInitialPrice(close);
      history.recordInitialBalance(INITIAL_BALANCE);
    }

    if (i > 0) {
      let lastMark = data[i - options.frequency];
      delta = close - lastMark.close;
      history.recordPriceDelta(delta);
    }

    return trade.onData(
      strategy,
      { close, delta },
      history
    );
  }
}

function allArrays(left, right) {
  let result = [];
  for (var i = 0; i < left.length; i++) {
    for (var j = 0; j < right.length; j++) {
      result.push([left[i], right[j]])
    }
  }
  return result;
}

function init(strategy) {
  let strategies = getStrategies(strategy);

  when.iterate(x => x+1,
    x => x >= strategies.length,
    x => {
      return simulateMonitoring(strategies[x]);
    }, 0).done();
}

function getStrategies(strategy) {
  strategy = _.pick(strategy, 'strategy', 'period', 'frequency');
  return _
    .chain(strategy.period)
    .split(',')
    .map(n => {
      let result = [];
      if (n.indexOf('...')) {
        let arr = _.split(n, '...');
        return _.range(parseInt(arr[0]), parseInt(arr[1]));
      } else {
        result = parseInt(n);
      }
      return result;
    })
    .thru(current => {
      return allArrays(current[0], current[1]);
    })
    .map(arr => {
      return _.extend(
        {},
        strategy,
        { period: arr }
      );
    })
    .value();
}

module.exports = {
  init
};
