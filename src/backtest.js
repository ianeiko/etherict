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

const prompt = require('prompt');
const _ = require('lodash');
const when = require('when');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

const strategy = require('./strategy');
const trade = require('./trade');
const orders = require('./orders');
const history = require('./history');
const review = require('./review');

const TRAINING_DATA = './data/BTC_ETH.json';
const INITIAL_BALANCE = {'btc': 1};

function simulateMonitoring(options){
  history.clearHistory();
  strategy.setStrategy(options);

  fs.readFile(TRAINING_DATA, (err, data) => {
    if(err) throw err;

    data = JSON.parse(data);
    when.iterate(x => x+1,
      x => x >= data.length,
      x => simulate(options, data, x), 0).done(() => {
        return when.resolve(review.reviewResults(data));
      });
  });
}

function simulate(options, data, i) {
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

    return trade.onData({
      close,
      delta
    });
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
  orders.updateBudget(INITIAL_BALANCE);
  let strategies = getStrategies(strategy);
  console.log('strategies', strategies);

  when.iterate(x => x+1,
    x => x >= strategies.length,
    x => simulateMonitoring(strategies[x]), 0).done();
}

if (argv.strategy
  && argv.period
  && argv.frequency) {
  init(argv);
} else {
  prompt.start();
  prompt.get([{
    name: 'strategy',
    default: 'sma'
  }, {
    name: 'period',
    default: '5...8,15...18'
  }, {
    name: 'frequency',
    default: 288
  }], function (err, result) {
    console.log('Command-line input received:', result);
    init(result);
  });

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
