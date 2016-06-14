var expect = require('chai').expect;
var orders = require('../orders');
var nock = require('nock');

var orderMock = require('./mocks/order.json')
var balanceMock = require('./mocks/balance.json')
var placeOrderMock = require('./mocks/place_order.json')

function setupServer(options){
  var defaultOptions = {
    api_method: 'Balance',
    api_type: 'private',
    http_status: 200,
    method: 'post',
    response: {}
  }
  options = Object.assign({}, defaultOptions, options);
  before(() => {
    nock('https://api.kraken.com')
        .post(`/0/${options.api_type}/${options.api_method}`)
        .reply(options.http_status, options.response);
  });
}

describe('Orders', () => {
  beforeEach(() => {
    orders.reset();
  });
  afterEach(() => {
    nock.cleanAll();
    orders.reset();
  });

  describe('checkBudget', () => {
    it('returns budget', () => {
      var budget = orders.checkBudget();
      expect(budget).to.eql({eth: 0, btc: 0});
    });
  });

  describe('checkBudgetAPI', () => {
    setupServer({
      api_method: 'Balance',
      response: balanceMock
    });

    it('returns budget', () => {
      return orders.checkBudgetAPI()
            .then((budget) => {
              expect(budget).to.eql({eth: 0, btc: 0});
            });
    });

  });

  describe('placeOrder', () => {
    it('createSellAllEthOrder -> placeOrder', () => {
      var expectedOrder = { descr: { type: 'buy' }, cost: 100, vol_exec: 100 };
      orders.updateBudget({'eth': 100});
      var order = orders.createSellAllEthOrder({close: 1 });
      console.log(orders.placeOrder);
      return orders.placeOrder(order)
                    .then(placedOrder => {
                      expect(placedOrder).to.eql(expectedOrder);
                    });
    });
    it('createSellAllBtcOrder -> placeOrder', () => {
      var expectedOrder = { descr: { type: 'sell' }, cost: 100, vol_exec: 100 };
      orders.updateBudget({'btc': 100});
      var order = orders.createSellAllBtcOrder({close: 1 });
      return orders.placeOrder(order)
                    .then(placedOrder => {
                      expect(placedOrder).to.eql(expectedOrder);
                    });
    });
  });

  describe('placeOrderAPI -> checkOpenOrders -> checkOrderById', () => {

    it('placeOrderAPI', () => {
      setupServer({
        api_method: 'AddOrder',
        response: placeOrderMock
      });

      it('returns transaction id', () => {
        var order = {};
        return orders.placeOrderAPI(order)
              .then((res) => {
                expect(res).to.eql('TEST_ORDER_TXID');
              });
      });
    });

    it('checkOpenOrders', () => {
      var response = { error: [], result: { open: {} } };
      setupServer({
        api_method: 'OpenOrders',
        response: response
      });

      it('returns opens order transaction id', () => {
        return orders.checkOpenOrders()
              .then((res) => {
                expect(res).to.eql(['TEST_ORDER_TXID']);
              });
      });

    });

    it('checkOrderById', () => {
      setupServer({
        api_method: 'QueryOrders',
        response: orderMock
      });

      it('returns order', () => {
        var txid = 'TEST_ORDER_TXID';
        return orders.checkOrderById(txid)
              .then((res) => {
                expect(res).to.eql(orderMock.result['TEST_ORDER_TXID']);
              });
      });

    });

  });

});

