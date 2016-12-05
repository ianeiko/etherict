const _ = require('lodash');
const when = require('when');
const strategy = require('./strategy');

async function onData(data, history, orders, options){
  try {
    await orders.checkOrders();

    history.recordCloseData(data.close);
    _.set(data, 'close_data', history.getCloseData());
    _.set(data, 'last_order', history.getLastOrder());
    const action = await strategy.shouldTrade(data, options);

    const order = await planTrade(action, data, history, orders);

    if (!order) return false;
    return orders.placeOrder(order);
  } catch(err) {
    console.error(err);
  }
}

function planTrade(action, data, history, orders){
  let order;
  if (action === 'exit') {
    order = orders.createSellAllEthOrder(data);
  } else if(action === 'stop_loss') {
    data = _.merge( data, { stop_loss: true });
    order = orders.createSellAllEthOrder(data);
  } else if(action === 'enter') {
    order = orders.createSellAllBtcOrder(data);
  }
  if (history.inPosition()) {
    history.recordPriceDelta(data.delta);
  }
  if (order) {
    history.recordOrder(order);
    return order;
  }
}

module.exports = {
  onData
};
