var _ = require('lodash');
var when = require('when');
var KrakenClient = require('kraken-api');
var KrakenConfig = require('./kraken-config.js').config;
var kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);
var request = require('request');

const SIMULATE_ORDER = false;
var fauxOrder = {};
var budget = {
  'eth': 0,
  'btc': 0
}
var orders = [];
var placingOrder = false;

var baseOrder = {
  pair: 'ETHXBT',
  ordertype: 'limit',
  expiretm: 0, /* optional */
  validate: true /* optional */
}
function sellAllEth(data){
  if(checkBudget('eth') <= 0) return;
  var order = Object.assign({}, baseOrder, {
    type: 'sell',
    price: parseFloat(data.close),
    volume: parseFloat(checkBudget('eth')),
  });
  return placeOrder(order);
}

function sellAllBtc(data){
  if(checkBudget('btc') <= 0) return;
  var order = Object.assign({}, baseOrder, {
    type: 'buy',
    price: parseFloat(data.close),
    volume: parseFloat(checkBudget('btc')),
  });
  return placeOrder(order);
}

function placeOrder(order){
  if (placingOrder || orders.length > 0) return;
  if (!order || !order.pair || !order.type || !order.ordertype || !order.ordertype || !order.volume) throw "Missing required order fields";
  if (order.pair !== 'ETHXBT') throw "Invalid pair";
  if (order.type === 'buy' || order.type === 'sell') {} else { throw "Invalid type" };
  if (order.ordertype !== 'limit') throw "Unsupported ordertype";
  if (order.price <= 0) throw "Invalid order price";
  if (order.volume <= 0) throw "Invalid order volume";

  // call api to place order
  if (SIMULATE_ORDER) {
    return simulateOrder(order);
  } else {
    placingOrder = true;
    return placeOrderAPI(order);
  }
}

function simulateOrder(order) {
  return when.promise(resolve => {
    orders.push('SIMULATE_ORDER');
    if (order.type === 'buy') {
      fauxOrder = {
        descr: {
          type: 'sell'
        },
        cost: (order.volume / order.price),
        vol_exec: (order.volume),
        // fee: use 0.12%
      };
    } else if (order.type === 'sell') {
      fauxOrder = {
        descr: {
          type: 'buy'
        },
        cost: (order.volume * order.price),
        vol_exec: (order.volume),
        // fee: use 0.12%
      };
    }
    resolve();
    console.log(`${order.type} at ${order.price}; budget`, checkBudget());
  });
}

function placeOrderAPI(order) {
  return when.promise((resolve, reject) => {
    kraken.api('AddOrder', order, function(err, data){
      if (err) reject(err);
      if (!data.result || !data.txid || !data.result.descr) reject('Invalid response');
      orders.push(data.txid);
      placingOrder = false;
      resolve(data.txid);
    });
  });
}

function checkOrders(){
  console.log('checking orders..')
  if (orders.length > 0) {
    console.log('current orders: ', orders);
  }
  if (orders.length === 1){
    when(checkOrderById(orders[0]))
        .then((t) => orderClosed(t));

  } else if (orders.length > 0) {
    checkOpenOrders();
  }
}

function orderClosed(order){
  when.promise((resolve) => {
    order.cost = parseFloat(order.cost);
    order.vol_exec = parseFloat(order.vol_exec);
    order.fee = parseFloat(order.fee);

    // TODO - APPLY FEE!
    if (order.descr.type === 'sell') {
      updateBudget({
        'btc': (order.vol_exec * -1),
        'eth': (order.cost)
      });
    } else if (order.descr.type === 'buy') {
      updateBudget({
        'btc': (order.cost),
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
      if (err) reject(err);
      if (!data.result || !data.result.open) reject('Invalid response');
      var openOrders = data.result.open;
      orders = _.without(orders, openOrders);
      resolve(orders);
    });
  });
}

function checkOrderById(txid){
  return when.promise((resolve, reject, notify) => {
    if (SIMULATE_ORDER) {
      resolve(fauxOrder);
    }

    kraken.api('QueryOrders', {
      txid
    }, function(err, data){
      if (err) reject(err);
      if (!data.result || !data.result[txid]) reject('Invalid response');
      resolve(data.result[txid]);
    })
  });
}

function checkBudgetAPI(){
  return when.promise((resolve, reject, notify) => {
    kraken.api('Balance', {}, function(err, data){
      if (err) reject(err);
      var eth = parseFloat(_.get(data, 'result.XETH'));
      var btc = parseFloat(_.get(data, 'result.XXBT'));
      resolve(updateBudget({eth, btc}));
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
  console.log('budget updated: ', budget);
  return budget;
}

var exports = {
  checkBudget,
  checkBudgetAPI,
  checkOrders,
  updateBudget,
  placeOrder,
  sellAllBtc,
  sellAllEth
}

if(process.env.NODE_ENV === 'test') {
  exports = Object.assign({}, exports, {
    placeOrderAPI,
    checkOpenOrders,
    checkOrderById
  });
}

module.exports = exports;