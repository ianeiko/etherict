const expect = require('chai').expect;
const backtest = require('../src/backtest');
const orders = require('../src/orders');

describe('Backtest', () => {
  afterEach(() => {
    orders.reset();
  });

  describe('simulateMonitoring', () => {

    it('backtest does not throw an error', () => {
      backtest.simulateMonitoring();
    });

  });

});
