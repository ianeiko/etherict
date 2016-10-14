const _ = require('lodash');
const when = require('when');

async function onData(data, history, orders, strategy){
  try {
    await orders.checkOrders();
    let action = await strategy.shouldTrade(data);
    let order = await planTrade(action, data, history, orders);

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
  if (order) {
    history.recordPriceDelta(data.delta);
    history.recordOrder(order);
    return order;
  }
}

module.exports = {
  onData
};
