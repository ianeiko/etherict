const prompt = require('prompt');
const argv = require('minimist')(process.argv.slice(2));
const backtest = require('./backtest');

if (argv.system
  && argv.period
  && argv.frequency) {
  backtest.init(argv);
} else {
  prompt.start();
  prompt.get([{
    name: 'system',
    default: 'sma,simple_sma'
  }, {
    name: 'period',
    default: '5...5,12...13'
  }, {
    name: 'frequency',
    default: 288
  }], function (err, result) {
    console.log('Command-line input received:', result);
    backtest.init(result);
  });

}
