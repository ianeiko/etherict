var _ = require('lodash');
var when = require('when');
var KrakenClient = require('kraken-api');
var KrakenConfig = require('./kraken-config.js').config;
var kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);

const BACKTESTING = false;
const SIMULATE_LIVE = true;
const SAMPLE_TXID = 'O4TOX7-YMLBP-IOH2S6';
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

  // call api to place order
  if (BACKTESTING) {
    simulateOrder(order);
  } else {
    placingOrder = true;
    placeOrderAPI(order);
  }
}

function placeOrderAPI(order, callback) {
  kraken.api('AddOrder', order, function(err, data){
    if (err) throw err;

    if (SIMULATE_LIVE) {
      data.txid = SAMPLE_TXID;
      console.log(`simulating order with ${data.txid}`);
    }
    if (data.txid) {
      console.log('order placed: ', data.result.descr);
      orders.push(data.txid);
      placingOrder = false;
    }
  });
}

function checkOrders(){
  if (orders.length === 1){
    when(checkOrderById(orders[0]))
        .then((t) => orderClosed(t))
        .then(() => console.log(checkBudget()));

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
      updateBudget({'btc': (order.vol_exec * -1)});
      updateBudget({'eth': (order.cost)});
    } else if (order.descr.type === 'buy') {
      updateBudget({'btc': (order.cost)});
      updateBudget({'eth': (order.vol_exec * -1)});
    }
  });
}

function checkOpenOrders(){
  kraken.api('OpenOrders', {}, function(err, data){
    if (err) throw err;
    var openOrders = data.result.open;
    orders = _.without(orders, openOrders);
  });
}

function checkOrderById(txid){
  return when.promise((resolve, reject, notify) => {
    kraken.api('QueryOrders', {
      txid
    }, function(err, data){
      if (err) throw err;
      var t = data.result[txid];
      resolve(t);
    })
  });
}

function checkBudgetAPI(){
  kraken.api('Balance', {}, function(err, data){
    if (err) throw err;
    updateBudget({'eth': parseFloat(data.result.XETH)});
    updateBudget({'btc': parseFloat(data.result.XXBT)});
  });
}

/* -------------------------------------------------- */
/* BACKTESTING ONLY */
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
    price: data.close,
    volume: checkBudget('eth'),
  })
  placeOrder(order);
}

function sellAllBtc(data){
  if(checkBudget('btc') <= 0) return;
  var order = Object.assign({}, baseOrder, {
    type: 'buy',
    price: data.close,
    volume: checkBudget('btc'),
  })
  placeOrder(order);
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
  console.log('budget updated: ', budget);
  return budget;
}

module.exports = {
  checkBudget,
  checkBudgetAPI,
  checkOrders,
  updateBudget,
  placeOrder,
  sellAllBtc,
  sellAllEth
}