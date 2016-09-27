const _ = require('lodash')
const when = require('when');

let initialPrice;
let orderHistory = [];
let priceDeltaHistory = [];

function recordPriceDelta(price) {
  priceDeltaHistory.push(price);
}

function getPriceDeltaHistory() {
  return priceDeltaHistory;
}

function recordInitialPrice(price) {
  initialPrice = price;
}

function getInitialPrice() {
  return initialPrice;
}

function recordOrder(order) {
  orderHistory.push(order);
}

function getOrderHistory() {
  return orderHistory;
}

function getLastOrder() {
  return _.last(orderHistory);
}

module.exports = {
  recordOrder,
  getOrderHistory,
  recordInitialPrice,
  getInitialPrice,
  recordPriceDelta,
  getPriceDeltaHistory,
  getLastOrder
}
