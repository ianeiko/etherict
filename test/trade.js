const expect = require('chai').expect;
const trade = require('../src/trade');
const orders = require('../src/orders');
const HistoryClass = require('../src/history');
const StrategyClass = require('../src/strategy');

describe('Trade', () => {
  afterEach(() => {
    orders.reset();
  });

  describe('onData', () => {

    it('trade does not throw an error', () => {
      let history = new HistoryClass();
      let strategy = new StrategyClass({}, history);
      let close = 0;
      let delta = 0;
      trade.onData(
        strategy,
        { close, delta },
        history
      );
    });

  });

});
