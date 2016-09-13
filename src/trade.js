const when = require('when');
const orders = require('./orders');
const strategy = require('./strategy');

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
  if (action === 'sell') {
    return orders.createSellAllEthOrder(data);
  } else if(action === 'buy') {
    return orders.createSellAllBtcOrder(data);
  }
}

module.exports = {
  onData
};