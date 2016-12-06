const _ = require('lodash')
const when = require('when');
const talib = require('talib');
const defaultStrategy = {
  period: [9, 26],
  stoploss: 1,
  enterMargin: 5,
  exitMargin: 4
};

function shouldTrade(data, strategy) {
  const options = _.defaults(strategy, defaultStrategy);
  const talibConf = getTalibConfig(data, options);
  const action = actionForStrategy(data, options, talibConf);

  return when.promise((resolve, reject) => {
    return resolve(action);
  })
}

function simpleSmaStrategy(data, options) {
  return getAction({
    should_enter: data.sma1 > data.sma2,
    should_exit: data.sma1 < data.sma2
  });
}

function smaStrategy(data, options) {
  const last_order_position = _.get(data, 'last_order.position');
  const last_order_price =  _.get(data, 'last_order.price');

  const sell_price = data.close - (data.close * .0016);
  const should_enter = (data.sma1 - data.sma2) > (data.sma2 * options.enterMargin/100);
  const should_exit = (data.sma2 - data.sma1) > (data.sma2 * options.exitMargin/100);

  let stop_loss;
  if (last_order_position === 'enter' &&
    last_order_price > (sell_price + (sell_price * (options.stoploss / 100)))) {
    stop_loss = true;
  }
  return getAction({
    should_enter,
    should_exit,
    stop_loss
  });
}

function priceSmaStrategy(data, options) {
  const last_order_position = _.get(data, 'last_order.position');
  const last_order_price =  _.get(data, 'last_order.price');
  const last_order_stop_loss =  _.get(data, 'last_order.stop_loss');

  const buy_price = data.close + (data.close * .0016);
  const sell_price = data.close - (data.close * .0016);

  let should_enter = (data.sma2 - buy_price) > (buy_price * .075);
  const should_exit = (sell_price - data.sma1) > (sell_price * .075);

  let stop_loss;
  if (last_order_position === 'enter' &&
    last_order_price > (sell_price * 1.01)) {
    stop_loss = true;
  }

  // consecutive stop_loss
  if (last_order_stop_loss && should_enter) {
    should_enter = (data.sma2 - buy_price) > (buy_price * .15);
  }

  return getAction({
    should_enter,
    should_exit,
    stop_loss
  });
}

function macdStrategy(data, options) {
  const last_order_position = _.get(data, 'last_order.position');
  const last_order_price =  _.get(data, 'last_order.price');

  const sell_price = data.close - (data.close * .0016);
  const should_enter = data.macd.signal < 0;
  const should_exit = data.macd.signal > 0;

  if (should_exit) {
    console.log('should_exit', data.macd);
  }
  if (should_enter) {
    console.log('should_exit', data.macd);
  }

  // let stop_loss;
  // if (last_order_position === 'enter' &&
  //   last_order_price > (sell_price + (sell_price * (options.stoploss / 100)))) {
  //   stop_loss = true;
  // }
  return getAction({
    should_enter,
    should_exit,
    // stop_loss
  });
}

function actionForStrategy(data, options, talibConf) {
  let action;

  const smaTransform = data => {
    return talibConf => {
      const sma1_promise = talib_calc(talibConf[0])
        .then(sma1 => {
          _.set(data, 'sma1', sma1.result.outReal)
          return data;
        });
      const sma2_promise = talib_calc(talibConf[1])
        .then(sma2 => {
          _.set(data, 'sma2', sma2.result.outReal)
          return data;
        });

      return when.all([sma1_promise, sma2_promise]);
    }
  }

  const macdTransform = data => {
    return talibConf => {
      return talib_calc(talibConf)
        .then(macd => {
          data.macd = {
            line: _.last(macd.result.outMACD),
            signal: _.last(macd.result.outMACDSignal)
          }
          return data
        })
    }
  }

  switch (options.system) {
    case 'simple_sma':
      return smaTransform(data)(talibConf)
        .then(data => {
          return simpleSmaStrategy(data, options)
        })
      break;
    case 'sma':
      return smaTransform(data)(talibConf)
        .then(data => {
          return smaStrategy(data, options)
        })
      break;
    case 'price_sma':
      return smaTransform(data)(talibConf)
        .then(data => {
          return priceSmaStrategy(data, options)
        })
      break;
    case 'macd':
      return macdTransform(data)(talibConf)
        .then(data => {
          return macdStrategy(data, options)
        })
      break;
  }
}

function getAction(params) {
  let action;
  if (params.stop_loss) {
    action = 'stop_loss';
  } else if (params.should_enter) {
    action = 'enter';
  } else if(params.should_exit) {
    action = 'exit';
  }
  return action;
}

function getTalibConfig(data, options) {
  let startIdx = data.close_data.length - 1 - options.period[0];
  startIdx = (startIdx > 0) ? startIdx : 0;
  let baseConfig = {
    startIdx,
    endIdx: data.close_data.length - 1,
    inReal: data.close_data
  }

  let result;
  switch (options.system) {
    case 'simple_sma':
    case 'sma':
      result = getSmaTalibConfig(baseConfig, options);
      break;
    case 'price_sma':
      result = getSmaTalibConfig(baseConfig, options);
      result[0].optInTimePeriod = 7;
      result[1].optInTimePeriod = 21;
      break;
    case 'macd':
      result = getMacdTalibConfig(baseConfig, options);
      break;
  }
  return result;
}

function getMacdTalibConfig(baseConfig) {
  let result = Object.assign(
    {},
    baseConfig,
    {
      name: 'MACD',
      optInSignalPeriod: 9,
      optInFastPeriod: 12,
      optInSlowPeriod: 26
    }
  );
  return result;
}

function getSmaTalibConfig(baseConfig, options) {
  const result = [];
  const sma1 = Object.assign(
    {},
    baseConfig,
    {
      name: 'SMA',
      optInTimePeriod: options.period[1]
    }
  );
  const sma2 = Object.assign(
    {},
    baseConfig,
    {
      name: 'SMA',
      optInTimePeriod: options.period[0],
    }
  );
  result.push(sma1, sma2);
  return result;
}

function talib_calc(parameter){
  return new Promise((resolve, reject) => {
    talib.execute(parameter, function(result){
      resolve(result);
    })
  })
}

module.exports = {
  shouldTrade
}
