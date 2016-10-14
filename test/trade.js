const expect = require('chai').expect;
const trade = require.main.require('src/lib/trade');
const HistoryClass = require.main.require('src/lib/history');
const OrdersClass = require.main.require('src/lib/orders');
const StrategyClass = require.main.require('src/lib/strategy');

const SAMPLE_STRATEGY = {
  system: 'sma',
  period: '9,26',
  frequency: 288
}
const INITIAL_BALANCE = { btc: 1, eth: 0 }

describe('Trade', () => {

  describe('onData', () => {

    it('trade does not throw an error', () => {
      let history = new HistoryClass({
        initialBalance: INITIAL_BALANCE,
        initialPrice: 0
      });
      let orders = new OrdersClass({
        initialBalance: INITIAL_BALANCE
      });
      let strategy = new StrategyClass(SAMPLE_STRATEGY, history);
      let close = 0;
      let delta = 0;
      trade.onData(
        { close, delta },
        history,
        orders,
        strategy
      );
    });

  });

});
