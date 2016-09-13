const _ = require('lodash')
const when = require('when');
const talib = require('talib');
const orders = require('./orders');
const DATA_BUFFER_SIZE = 3000;
var dataBuff = [];

function shouldTrade(data) {
  var action;

  if(dataBuff.length >= DATA_BUFFER_SIZE) {
    dataBuff.shift();
  }

  dataBuff.push(data);

  var closeData = [];
  _.map(dataBuff, idx => {
    closeData.push(idx.close)
  });
  var baseConfig = {
    startIdx: 0,
    endIdx: closeData.length - 1,
    inReal: closeData,
    optInTimePeriod: DATA_BUFFER_SIZE
  }
  var sma = Object.assign(
    {name: 'SMA'},
    baseConfig
  )

  return when.promise((resolve, reject) => {
    if(dataBuff.length >= DATA_BUFFER_SIZE) {
      talib.execute(sma, function(result){
        data.sma = _.last(result.result.outReal);

        var buy_price = data.close + (data.close * .0016);
        var sell_price = data.close - (data.close * .0016);

        var should_buy = (data.sma - buy_price) > (buy_price * .1);
        var should_sell = (sell_price - data.sma) > (sell_price * .1);

        if(should_buy && !should_sell) {
          action = 'sell';
        }
        if(!should_buy && should_sell) {
          action = 'buy';
        }
        return resolve(action);
      });
    } else {
      return reject('filling buffer');
    }
  })
}

module.exports = {
  shouldTrade
}
