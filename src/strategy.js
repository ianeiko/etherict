const _ = require('lodash')
const when = require('when');
const talib = require('talib');
const orders = require('./orders');
const history = require('./history');
const DATA_BUFFER_SIZE = 7;
var closeData = [];

async function shouldTrade(data) {
  closeData.push(data.close);

  let startIdx = closeData.length - DATA_BUFFER_SIZE;
  startIdx = (startIdx > 0) ? startIdx : 0;
  let baseConfig = {
    startIdx,
    endIdx: closeData.length - 1,
    inReal: closeData,
    optInTimePeriod: DATA_BUFFER_SIZE
  }
  let sma1 = Object.assign(
    {
      name: 'SMA',
      optInTimePeriod: DATA_BUFFER_SIZE
    },
    baseConfig
  )
  data.sma1 = await talib_calc(sma1);
  // let sma2 = Object.assign(
  //   {
  //     name: 'SMA',
  //     optInTimePeriod: DATA_BUFFER_SIZE * 3
  //   },
  //   baseConfig
  // )
  // data.sma2 = await talib_calc(sma2);

  return when.promise((resolve, reject) => {
    if(closeData.length >= DATA_BUFFER_SIZE) {
      when.promise(() => {
        let action;

        let buy_price = data.close + (data.close * .0016);
        let sell_price = data.close - (data.close * .0016);

        let should_buy = (data.sma1 - buy_price) > (buy_price * .1);
        let should_sell = (sell_price - data.sma1) > (sell_price * .1);

        if(should_buy) {
          action = 'sell';
        } else if (should_sell) {
          action = 'buy';
        }
        return resolve(action);
      })
    } else {
      return reject('filling buffer');
    }
  })
}

function talib_calc(parameter){
  return new Promise((resolve, reject) => {
    talib.execute(parameter, function(result){
      let outReal = _.last(result.result.outReal);
      resolve(outReal);
    })
  })
}

module.exports = {
  shouldTrade
}
