var expect = require('chai').expect;
var orders = require('../orders');
var nock = require('nock');
var server;

var orderMock = { error: [],
                        result:
                         { 'TEST_ORDER_TXID':
                            { refid: null,
                              userref: null,
                              status: 'closed',
                              reason: null,
                              opentm: 1463121228.4524,
                              closetm: 1463200419.8892,
                              starttm: 0,
                              expiretm: 0,
                              descr:
                                { pair: 'ETHXBT',
                                  type: 'buy',
                                  ordertype: 'limit',
                                  price: '0.022000',
                                  price2: '0',
                                  leverage: 'none',
                                  order: 'buy 1000.00000000 ETHXBT @ limit 0.022000' },
                              vol: '1000.00000000',
                              vol_exec: '1000.00000000',
                              cost: '22.000000',
                              fee: '0.030800',
                              price: '0.022000',
                              misc: '',
                              oflags: 'fciq' } } };

describe('Orders', () => {
  describe('checkBudget', () => {
    it('returns budget', () => {
      var budget = orders.checkBudget();
      expect(budget).to.eql({eth: 0, btc: 0});
    });
  });

  describe('checkBudgetAPI', () => {
    before(() => {
      var response = { error: [],
                        result:
                         { ZUSD: '0',
                           XXBT: '0',
                           XETH: '0' } };

      nock('https://api.kraken.com')
          .post('/0/private/Balance')
          .reply(200, response);
    });

    after(() => {
      nock.cleanAll();
    })

    it('returns budget', () => {
      return orders.checkBudgetAPI()
            .then((budget) => {
              expect(budget).to.eql({eth: 0, btc: 0});
            });
    });

  });

  describe('placeOrderAPI', () => {
    before(() => {
      var response = { error: [],
                        result: { descr: { order: 'sell 1000.00000000 ETHXBT @ limit 0.024189' } },
                        txid: 'TEST_ORDER_TXID' };

      nock('https://api.kraken.com')
          .post('/0/private/AddOrder')
          .reply(200, response);
    });

    after(() => {
      nock.cleanAll();
    })

    it('returns transaction id', () => {
      var order = {};
      return orders.placeOrderAPI(order)
            .then((res) => {
              expect(res).to.eql('TEST_ORDER_TXID');
            });
    });

  });

  describe('OpenOrders', () => {
    before(() => {
      var response = { error: [], result: { open: {} } };
      nock('https://api.kraken.com')
          .post('/0/private/OpenOrders')
          .reply(200, response);
    });

    after(() => {
      nock.cleanAll();
    })

    it('returns opens order transaction id', () => {
      return orders.checkOpenOrders()
            .then((res) => {
              expect(res).to.eql(['TEST_ORDER_TXID']);
            });
    });

  });

  describe('QueryOrders', () => {
    before(() => {
      nock('https://api.kraken.com')
          .post('/0/private/QueryOrders')
          .reply(200, orderMock);
    });

    after(() => {
      nock.cleanAll();
    })

    it('returns order', () => {
      var txid = 'TEST_ORDER_TXID';
      return orders.checkOrderById(txid)
            .then((res) => {
              expect(res).to.eql(orderMock.result['TEST_ORDER_TXID']);
            });
    });

  });

});

