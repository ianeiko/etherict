const _ = require('lodash');
const when = require('when');
const fs = require('fs');
const KrakenClient = require('kraken-api');
const KrakenConfig = require('../config/kraken-config.js').config;
const kraken = new KrakenClient(KrakenConfig.api_key, KrakenConfig.api_secret);
const request = require('request');

const SIMULATE_ORDER = process.env.SIMULATE_ORDER;
const baseOrder = {
  pair: 'ETHXBT',
  ordertype: 'limit',
  expiretm: 0, /* optional */
  validate: true /* optional */
}

function logMsg(msg){
  msg = `[${new Date()}]: ${msg}`;
  fs.appendFile('log.txt', `${msg}\n`);
  console.log(msg);
}

class Strategy {
  constructor(options) {
    this.fauxOrder = {};
    this.budget = {
      'eth': 0,
      'btc': 0
    }
    this.orders = [];
    this.placingOrder = false;
    
    if (_.get(options, 'initialBalance')) {
      this.updateBudget(_.get(options, 'initialBalance'));
    };
  }

  createSellAllEthOrder(data){
    if(this.checkBudget('eth') <= 0) return;
    let stop_loss = data.stop_loss;
    let order = Object.assign({}, baseOrder, {
      stop_loss,
      position: 'exit',
      type: 'sell',
      price: parseFloat(data.close),
      volume: parseFloat(this.checkBudget('eth')),
    });
    order = _.omitBy(order, _.isNil);
    return order;
  }

  createSellAllBtcOrder(data){
    if(this.checkBudget('btc') <= 0) return;
    var order = Object.assign({}, baseOrder, {
      position: 'enter',
      type: 'buy',
      price: parseFloat(data.close),
      volume: parseFloat(this.checkBudget('btc')),
    });
    return order;
  }

  placeOrder(order){
    return when.promise((resolve, reject) => {
      if (!order || _.isUndefined(order) || _.isNull(order)) return reject('Missing order');
      if (this.orders.length > 0 || this.placingOrder) return reject('Already placing order');
      if (!order.pair || !order.type || !order.ordertype || !order.ordertype || !order.volume) return reject('Missing required order fields');
      if (order.pair !== 'ETHXBT') return reject('Invalid pair');
      if (order.type === 'buy' || order.type === 'sell') {} else { return reject('Invalid type') };
      if (order.ordertype !== 'limit') return reject('Unsupported ordertype');
      if (order.price <= 0) return reject('Invalid order price');
      if (order.volume <= 0) return reject('Invalid order volume');

      // call api to place order
      if (SIMULATE_ORDER) {
        return resolve(this.simulateOrder(order));
      } else {
        this.placingOrder = true;
        return resolve(this.placeOrderAPI(order));
      }
    });
  }

  simulateOrder(order) {
    return when.promise(resolve => {
      this.orders.push('SIMULATE_ORDER');
      logMsg(`${order.type}ing at ${order.price}`);

      if (order.type === 'buy') {
        var cost = (order.volume / order.price);
        var type = 'sell';
      } else if (order.type === 'sell') {
        var cost = (order.volume * order.price);
        var type = 'buy';
      }
      logMsg(`order cost is: ${cost}`);
      this.fauxOrder = {
        descr: {
          type: type
        },
        cost,
        vol_exec: order.volume,
      };
      return resolve(this.fauxOrder);
      console.log(`${order.type} at ${order.price}; budget`, this.checkBudget());
    });
  }

  placeOrderAPI(order) {
    return when.promise((resolve, reject) => {
      kraken.api('AddOrder', order, function(err, data){
        if (err) return reject(err);
        if (!data.result || !data.txid || !data.result.descr) return reject('Invalid response');
        this.orders.push(data.txid);
        this.placingOrder = false;
        return resolve(data.txid);
      });
    });
  }

  async checkOrders(){
    if (this.orders.length !== 1) return;
    try {
      let trade = await this.checkOrderById(this.orders[0]);
      await this.orderClosed(trade);
    } catch(err) {
      console.error(err);
    }

  }

  orderClosed(order){
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
        this.updateBudget({
          'btc': (order.vol_exec * -1),
          'eth': (order.cost - order.fee)
        });
      } else if (order.descr.type === 'buy') {
        this.updateBudget({
          'btc': (order.cost - order.fee),
          'eth': (order.vol_exec * -1)
        });
      }

      // TODO - only clear order with match txid
      this.orders = [];
      this.fauxOrder = {};
    });
  }

  checkOpenOrders(){
    return when.promise((resolve, reject, notify) => {
      kraken.api('OpenOrders', {}, function(err, data){
        if (err) return reject(err);
        if (!data.result || !data.result.open) return reject('Invalid response');
        var openOrders = data.result.open;
        this.orders = _.without(this.orders, openOrders);
        return resolve(this.orders);
      });
    });
  }

  checkOrderById(txid){
    return when.promise((resolve, reject, notify) => {
      if (SIMULATE_ORDER) {
        return resolve(this.fauxOrder);
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

  checkBudgetAPI(){
    let resolveCheckBudget = (balance) => this.updateBudget(balance);
    return when.promise((resolve, reject, notify) => {
      kraken.api('Balance', {}, function(err, data){
        if (err) return reject(err);
        var eth = parseFloat(_.get(data, 'result.XETH'));
        var btc = parseFloat(_.get(data, 'result.XXBT'));
        return resolve(resolveCheckBudget({eth, btc}));
      });
    });
  }

  checkBudget(currency){
    if (!currency) return this.budget;
    if (currency === 'eth' || currency === 'btc') {} else { throw "Invalid currency" };
    return this.budget[currency];
  }

  updateBudget(value){
    var currencies = _.keys(value);
    _.map(currencies, (currency) => {
      if (currency === 'eth' || currency === 'btc') {} else { throw "Invalid currency" };
      this.budget[currency] += value[currency];
    })
    logMsg(`budget updated: ${JSON.stringify(this.budget)}`);
    return this.budget;
  }

  reset(){
    this.budget = {
      'eth': 0,
      'btc': 0
    }
    this.orders = [];
    this.fauxOrder = {};
    this.placingOrder = false;
    return this.budget;
  }
}

module.exports = Strategy;

// var exports = {
//   checkBudget,
//   checkBudgetAPI,
//   checkOrders,
//   updateBudget,
//   placeOrder,
//   createSellAllBtcOrder,
//   createSellAllEthOrder,
//   reset
// }
//
// if(process.env.NODE_ENV === 'test') {
//   exports = Object.assign({}, exports, {
//     placeOrderAPI,
//     checkOpenOrders,
//     checkOrderById
//   });
// }
//
// module.exports = exports;
