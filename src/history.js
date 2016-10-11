const _ = require('lodash')
const when = require('when');

class History {
  constructor() {
    this.initialPrice;
    this.initialBalance;
    this.orderHistory = [];
    this.priceDeltaHistory = [];
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
