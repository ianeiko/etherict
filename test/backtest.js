const expect = require('chai').expect;
const backtest = require.main.require('src/backtest');

const SAMPLE_STRATEGY = {
  system: 'sma',
  period: '9,26',
  frequency: 288
}

describe('Backtest', () => {

  describe('init', () => {

    it('backtest does not throw an error', () => {
      backtest.init(SAMPLE_STRATEGY);
    });

  });

});
