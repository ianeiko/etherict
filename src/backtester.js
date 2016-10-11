const prompt = require('prompt');
const argv = require('minimist')(process.argv.slice(2));
const backtest = require('./backtest');

if (argv.strategy
  && argv.period
  && argv.frequency) {
  backtest.init(argv);
} else {
  prompt.start();
  prompt.get([{
    name: 'strategy',
    default: 'sma'
  }, {
    name: 'period',
    default: '3...23,8...28'
  }, {
    name: 'frequency',
    default: 288
  }], function (err, result) {
    console.log('Command-line input received:', result);
    backtest.init(result);
  });

}
