const when = require('when');
const orders = require('./orders');
const strategy = require('./strategy');
const history = require('./history');

async function onData(data){
  try {
    await orders.checkOrders();
    let action = await strategy.shouldTrade(data);
    let order = await planTrade(data, action);

    if (!order) return false;
    return orders.placeOrder(order);
  } catch(err) {
    console.error(err);
  }
}

function planTrade(data, action){
  let order;
  if (action === 'sell') {
    order = orders.createSellAllEthOrder(data);
  } else if(action === 'buy') {
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
