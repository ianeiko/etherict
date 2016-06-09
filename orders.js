var _ = require('lodash');
var when = require('when');
var KrakenClient = require('kraken-api');
var KrakenConfig = require('./kraken-config.js').config;
var kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);

const BACKTESTING = false;
const SIMULATE_LIVE = !BACKTESTING;
const SAMPLE_TXID = 'O4TOX7-YMLBP-IOH2S6';
var backtestingOrder = {};
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
    return simulateOrder(order);
  } else {
    placingOrder = true;
    return placeOrderAPI(order);
  }
}

function placeOrderAPI(order) {
  return when.promise(resolve => {
    kraken.api('AddOrder', order, function(err, data){
      if (err) console.error(err);

      try {
        if (!data.result) return;
        if (SIMULATE_LIVE) {
          data.txid = SAMPLE_TXID;
          console.log(`simulating order with ${data.txid}`);
        }
        if (data.txid) {
          console.log('order placed: ', data.result.descr);
          orders.push(data.txid);
          placingOrder = false;
        }
        resolve();
      } catch(e) {
        console.error(e)
      }
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
      updateBudget({'eth': (order.cost)});
      updateBudget({'btc': (order.vol_exec * -1)});
    } else if (order.descr.type === 'buy') {
      updateBudget({'btc': (order.cost)});
      updateBudget({'eth': (order.vol_exec * -1)});
    }

    // TODO - only clear order with match txid
    orders = [];
    backtestingOrder = {};
  });
}

function checkOpenOrders(){
  kraken.api('OpenOrders', {}, function(err, data){
    if (err) console.error(err);
    var openOrders = data.result.open;
    orders = _.without(orders, openOrders);
  });
}

function checkOrderById(txid){
  return when.promise((resolve, reject, notify) => {
    if (BACKTESTING) {
      return resolve(backtestingOrder);
    }

    kraken.api('QueryOrders', {
      txid
    }, function(err, data){
      if (err) console.error(err);
      var t = _.get(data, ['result', txid]);
      if (!t) return;
      resolve(t);
    })
  });
}

function checkBudgetAPI(){
  kraken.api('Balance', {}, function(err, data){
    if (err) console.error(err);
    var eth = parseFloat(_.get(data, 'result.XETH'));
    var btc = parseFloat(_.get(data, 'result.XXBT'));
    updateBudget({eth});
    updateBudget({btc});
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

function simulateOrder(order) {
  return when.promise(resolve => {
    orders.push('BACKTESTING');
    if (order.type === 'buy') {
      backtestingOrder = {
        descr: {
          type: 'sell'
        },
        cost: (order.volume / order.price),
        vol_exec: (order.volume),
        // fee: use 0.12%
      };
    } else if (order.type === 'sell') {
      backtestingOrder = {
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