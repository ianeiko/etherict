/*
////////////////////////////////////

npm run backtest -- --system=sma --period=9,26 --frequency=288 --month=3,4,5

frequency:
1 = 5 MINUTES
12 = 1 HOUR
144 = 12 HOURS
288 = DAY

////////////////////////////////////
*/

const when = require('when');
const readUtils = require('./util/read');
const prompt = require('prompt');
const argv = require('minimist')(process.argv.slice(2));

const backtest = require('./lib/backtest');

function init(strategy) {
  const strategies = readUtils.getStrategies(strategy);

  return when.promise(resolve => {
    return when.iterate(x => x + 1,
      x => x >= strategies.length,
      x => {
        console.log('simulating:', strategies[x]);
        const result = backtest.readBacktestData(strategies[x]);
        return resolve(result);
      }, 0).done();
  });
}

if (argv.system
  && argv.period
  && argv.frequency) {
  init(argv);
} else if (process.env.NODE_ENV !== 'test') {
  prompt.start();
  prompt.get([{
    name: 'system',
    default: 'sma,simple_sma'
    // default: 'sma'
  }, {
    name: 'period',
    default: '5...5,12...13'
  }, {
    name: 'frequency',
    default: 288
  }, {
    name: 'month',
    default: '3,4,5,6,7,8,9,10'
  }], (err, result) => {
    console.log('Command-line input received:', result);
    init(result);
  });
}

module.exports = {
  init
};
