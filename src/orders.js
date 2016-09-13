const _ = require('lodash');
const when = require('when');
const fs = require('fs');
const KrakenClient = require('kraken-api');
const KrakenConfig = require('./kraken-config.js').config;
const kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);
const request = require('request');

const SIMULATE_ORDER = process.env.SIMULATE_ORDER;
var fauxOrder = {};
var budget = {
  'eth': 0,
  'btc': 0
}
var orders = [];
var placingOrder = false;

const baseOrder = {
  pair: 'ETHXBT',
  ordertype: 'limit',
  expiretm: 0, /* optional */
  validate: true /* optional */
}

function createSellAllEthOrder(data){
  if(checkBudget('eth') <= 0) return;
  var order = Object.assign({}, baseOrder, {
    type: 'sell',
    price: parseFloat(data.close),
    volume: parseFloat(checkBudget('eth')),
  });
  return order;
}

function createSellAllBtcOrder(data){
  if(checkBudget('btc') <= 0) return;
  var order = Object.assign({}, baseOrder, {
    type: 'buy',
    price: parseFloat(data.close),
    volume: parseFloat(checkBudget('btc')),
  });
  return order;
}

function placeOrder(order){
  return when.promise((resolve, reject) => {
    if (!order || _.isUndefined(order) || _.isNull(order)) return reject('Missing order');
    if (orders.length > 0 || placingOrder) return reject('Already placing order');
    if (!order.pair || !order.type || !order.ordertype || !order.ordertype || !order.volume) return reject('Missing required order fields');
    if (order.pair !== 'ETHXBT') return reject('Invalid pair');
    if (order.type === 'buy' || order.type === 'sell') {} else { return reject('Invalid type') };
    if (order.ordertype !== 'limit') return reject('Unsupported ordertype');
    if (order.price <= 0) return reject('Invalid order price');
    if (order.volume <= 0) return reject('Invalid order volume');

    // call api to place order
    if (SIMULATE_ORDER) {
      return resolve(simulateOrder(order));
    } else {
      placingOrder = true;
      return resolve(placeOrderAPI(order));
    }
  });
}

function simulateOrder(order) {
  return when.promise(resolve => {
    orders.push('SIMULATE_ORDER');
    logMsg(`${order.type}ing at ${order.price}`);

    if (order.type === 'buy') {
      var cost = (order.volume / order.price);
      var type = 'sell';
    } else if (order.type === 'sell') {
      var cost = (order.volume * order.price);
      var type = 'buy';
    }
    logMsg(`order cost is: ${cost}`);
    fauxOrder = {
      descr: {
        type: type
      },
      cost,
      vol_exec: order.volume,
    };
    return resolve(fauxOrder);
    console.log(`${order.type} at ${order.price}; budget`, checkBudget());
  });
}

function placeOrderAPI(order) {
  return when.promise((resolve, reject) => {
    kraken.api('AddOrder', order, function(err, data){
      if (err) return reject(err);
      if (!data.result || !data.txid || !data.result.descr) return reject('Invalid response');
      orders.push(data.txid);
      placingOrder = false;
      return resolve(data.txid);
    });
  });
}

async function checkOrders(){
  if (orders.length !== 1) return;
  try {
    let trade = await checkOrderById(orders[0]);
    await orderClosed(trade);
  } catch(err) {
    console.error(err);
  }

}

function orderClosed(order){
  when.promise((resolve) => {
    order.cost = parseFloat(order.cost);
    order.vol_exec = parseFloat(order.vol_exec);
    if (SIMULATE_ORDER) {
      order.fee = order.cost * .0016;
    } else {
      order.fee = parseFloat(order.fee);
    }

    // TODO - APPLY FEE!
    if (order.descr.type === 'sell') {
      updateBudget({
        'btc': (order.vol_exec * -1),
        'eth': (order.cost - order.fee)
      });
    } else if (order.descr.type === 'buy') {
      updateBudget({
        'btc': (order.cost - order.fee),
        'eth': (order.vol_exec * -1)
      });
    }

    // TODO - only clear order with match txid
    orders = [];
    fauxOrder = {};
  });
}

function checkOpenOrders(){
  return when.promise((resolve, reject, notify) => {
    kraken.api('OpenOrders', {}, function(err, data){
      if (err) return reject(err);
      if (!data.result || !data.result.open) return reject('Invalid response');
      var openOrders = data.result.open;
      orders = _.without(orders, openOrders);
      return resolve(orders);
    });
  });
}

function checkOrderById(txid){
  return when.promise((resolve, reject, notify) => {
    if (SIMULATE_ORDER) {
      return resolve(fauxOrder);
    }

    kraken.api('QueryOrders', {
      txid
    }, function(err, data){
      if (err) return reject(err);
      if (!data.result || !data.result[txid]) return reject('Invalid response');
      return resolve(data.result[txid]);
    })
  });
}

function checkBudgetAPI(){
  return when.promise((resolve, reject, notify) => {
    kraken.api('Balance', {}, function(err, data){
      if (err) return reject(err);
      var eth = parseFloat(_.get(data, 'result.XETH'));
      var btc = parseFloat(_.get(data, 'result.XXBT'));
      return resolve(updateBudget({eth, btc}));
    });
  });
}

function checkBudget(currency){
  if (!currency) return budget;
  if (currency === 'eth' || currency === 'btc') {} else { throw "Invalid currency" };
  return budget[currency];
}

function updateBudget(value){
  var currencies = _.keys(value);
  _.map(currencies, (currency) => {
    if (currency === 'eth' || currency === 'btc') {} else { throw "Invalid currency" };
    budget[currency] += value[currency];
  })
  logMsg(`budget updated: ${JSON.stringify(budget)}`);
  return budget;
}

function logMsg(msg){
  msg = `[${new Date()}]: ${msg}`;
  fs.appendFile('log.txt', `${msg}\n`);
  console.log(msg);
}

function reset(){
  budget = {
    'eth': 0,
    'btc': 0
  }
  orders = [];
  fauxOrder = {};
  placingOrder = false;
  return budget;
}

var exports = {
  checkBudget,
  checkBudgetAPI,
  checkOrders,
  updateBudget,
  placeOrder,
  createSellAllBtcOrder,
  createSellAllEthOrder
}

if(process.env.NODE_ENV === 'test') {
  exports = Object.assign({}, exports, {
    placeOrderAPI,
    checkOpenOrders,
    checkOrderById,
    reset
  });
}

module.exports = exports;
