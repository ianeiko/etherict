var KrakenClient = require('kraken-api');
var KrakenConfig = require('./kraken-config.js').config;
var kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);
var _ = require('underscore');

var BACKTESTING = true;
var budget = {
  'eth': 0,
  'btc': 0
}
var orders = [];
var placingOrder = false;

function placeOrder(order){
  if (placingOrder || orders.length > 0) return;
  if (!order || !order.pair || !order.type || !order.ordertype || !order.ordertype || !order.volume) throw "Missing required order fields";
  if (order.pair !== 'ETHXBT') throw "Invalid pair";
  if (order.type === 'buy' || order.type === 'sell') {} else { throw "Invalid type" };
  if (order.ordertype !== 'limit') throw "Unsupported ordertype";
  if (order.price <= 0) throw "Invalid order price";
  if (order.volume <= 0) throw "Invalid order volume";

  // var budgetUsed = {};
  // var currency = (order.type === 'sell') ? 'eth' : 'btc';
  // budgetUsed[currency] = (order.type === 'sell') ? (order.volume * -1) : order.volume;
  // updateBudget(budgetUsed);
  placingOrder = true;

  // call api to place order
  if (BACKTESTING) {
    simulateOrder(order);
  } else {
    placeOrderAPI(order);
  }
}

function placeOrderAPI(order, callback) {
  // place order
  // callback: record order id
  placingOrder = false;
  txid = 'txid123';
  orders.push(txid);
  return txid;
}

function checkOrders(){
  if (orders.length > 0) {
    checkOrderAPI(orders[0]);
  }
}

function checkOrderAPI(txid) {
  console.log(txid);
  // callback from api
  // if order closed, update budget
  checkBudgetAPI();
}

function checkBudgetAPI(){
  // callback: set budget
}

/* -------------------------------------------------- */
/* BACKTESTING ONLY */
function sellAllEth(data){
  if(checkBudget('eth') <= 0) return;
  placeOrder({
    pair: 'ETHXBT',
    type: 'sell',
    ordertype: 'limit',
    price: data.close,
    volume: checkBudget('eth'),
    validate: true /* optional */
  });
}

function sellAllBtc(data){
  if(checkBudget('btc') <= 0) return;
  placeOrder({
    pair: 'ETHXBT',
    type: 'buy',
    ordertype: 'limit',
    price: data.close,
    volume: checkBudget('btc'),
    validate: true /* optional */
  });
}

function simulateOrder(order) {
  if (order.type === 'sell' && checkBudget('eth') >= order.volume) {
    updateBudget({'btc': (order.price * order.volume)});
    updateBudget({'eth': (order.volume * -1)});
  } else if (order.type === 'buy' && checkBudget('btc') >= order.volume) {
    updateBudget({'btc': (order.volume * -1)});
    updateBudget({'eth': order.volume / order.price});
  }
  console.log(`${order.type} at ${order.price}; budget`, checkBudget());
  orders = [];
  placingOrder = false;
}

function checkBudget(currency){
  if (!currency) return budget;
  if (currency === 'eth' || currency === 'btc') {} else { throw "Invalid currency" };
  return budget[currency];
}

function updateBudget(value){
  var currency = _.keys(value)[0];
  if (currency === 'eth' || currency === 'btc') {} else { throw "Invalid currency" };
  budget[currency] += value[currency];
  return budget;
}

module.exports = {
  checkBudget,
  updateBudget,
  placeOrder,
  sellAllBtc,
  sellAllEth
}