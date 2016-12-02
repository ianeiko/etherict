const mocha = require('mocha');
const expect = require('chai').expect;
const backtest = require.main.require('src/backtest');

const SAMPLE_STRATEGY = {
  system: 'sma',
  period: '9,26',
  frequency: 288
}

describe('Backtest', () => {

  describe('init', function() {
    // can't use fat arrow + timeout: http://javascript.tutorialhorizon.com/2015/11/22/how-to-set-the-timeout-of-a-test-in-mocha/
    this.timeout(5000);

    it('backtest does not throw an error', (done) => {
      backtest.init(SAMPLE_STRATEGY)
        .then((result) => {
          expect(result).to.be.ok;
        })
        .then(done);

    });

  });

});
