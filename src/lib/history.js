const _ = require('lodash');
const when = require('when');

class History {
  constructor(options) {
    this.initialPrice = _.get(options, 'initialPrice');
    this.initialBalance = _.get(options, 'initialBalance');
    this.orderHistory = _.get(options, 'orderHistory') || [];
    this.priceDeltaHistory = _.get(options, 'priceDeltaHistory') || [];
  }

  recordPriceDelta(price) {
    this.priceDeltaHistory.push(price);
  }

  getPriceDeltaHistory() {
    return this.priceDeltaHistory;
  }

  recordInitialBalance(price) {
    this.initialBalance = price;
  }

  getInitialBalance() {
    return this.initialBalance;
  }

  recordInitialPrice(price) {
    this.initialPrice = price;
  }

  getInitialPrice() {
    return this.initialPrice;
  }

  recordOrder(order) {
    this.orderHistory.push(order);
  }

  getOrderHistory() {
    return this.orderHistory;
  }

  getLastOrder() {
    return _.last(this.orderHistory);
  }
}

module.exports = History;
