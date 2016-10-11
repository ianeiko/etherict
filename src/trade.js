const _ = require('lodash');
const when = require('when');
const orders = require('./orders');

async function onData(strategy, data, history){
  try {
    await orders.checkOrders();
    let action = await strategy.shouldTrade(data);
    let order = await planTrade(data, action, history);

    if (!order) return false;
    return orders.placeOrder(order);
  } catch(err) {
    console.error(err);
  }
}

function planTrade(data, action, history){
  let order;
  if (action === 'exit') {
    order = orders.createSellAllEthOrder(data);
  } else if(action === 'stop_loss') {
    data = _.merge( data, { stop_loss: true });
    order = orders.createSellAllEthOrder(data);
  } else if(action === 'enter') {
    order = orders.createSellAllBtcOrder(data);
  }
  if (order) {
    history.recordOrder(order);
    return order;
  }
}

module.exports = {
  onData
};
