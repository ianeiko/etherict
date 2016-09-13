const expect = require('chai').expect;
const livetrade = require('../src/livetrade');
const orders = require('../src/orders');

describe('Livetrade', () => {
  afterEach(() => {
    orders.reset();
  });

  describe('monitorPrice', () => {

    it('trade does not throw an error', () => {
      livetrade.monitorPrice();
    });

  });

});

