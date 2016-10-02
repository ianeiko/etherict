const _ = require('lodash')
const when = require('when');

let initialPrice;
let initialBalance;
let orderHistory = [];
let priceDeltaHistory = [];

function recordPriceDelta(price) {
  priceDeltaHistory.push(price);
}

function getPriceDeltaHistory() {
  return priceDeltaHistory;
}

function recordInitialBalance(price) {
  initialBalance = price;
}

function getInitialBalance() {
  return initialBalance;
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

function clearHistory() {
  initialPrice = null;
  initialBalance = null;
  orderHistory = [];
  priceDeltaHistory = [];
}

module.exports = {
  clearHistory,
  recordOrder,
  getOrderHistory,
  recordInitialBalance,
  getInitialBalance,
  recordInitialPrice,
  getInitialPrice,
  recordPriceDelta,
  getPriceDeltaHistory,
  getLastOrder
}
