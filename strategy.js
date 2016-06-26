var _ = require('lodash')
var when = require('when');
var talib = require('talib');
var orders = require('./orders');
var dataBuff = [];
const DATA_BUFFER_SIZE = 28;

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
    optInTimePeriod: 2
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

        var should_buy = (data.sma - buy_price) > (buy_price * .015);
        var should_sell = (buy_price - data.sma) > (buy_price * .015);

        if(should_buy) {
          action = 'sell';
        } else if(should_sell) {
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
