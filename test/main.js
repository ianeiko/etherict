var expect = require('chai').expect;
var orders = require('../orders');
var nock = require('nock');
var server;

describe('Orders', () => {
  describe('checkBudget', () => {
    it('returns budget', () => {
      var budget = orders.checkBudget();
      expect(budget).to.eql({eth: 0, btc: 0});
    });
  });

  describe('checkBudgetAPI', () => {
    before(() => {
      var balanceResponse = { error: [],
                        result:
                         { ZUSD: '0',
                           XXBT: '0',
                           XETH: '0' } };

      nock('https://api.kraken.com')
          .post('/0/private/Balance')
          .reply(200, balanceResponse);
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

  })
});

