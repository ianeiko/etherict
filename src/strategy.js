const _ = require('lodash')
const when = require('when');
const talib = require('talib');
const orders = require('./orders');
const history = require('./history');
let closeData = [];
let options = {};

function setStrategy(strategy) {
  let defaultOptions = {
    period: [9, 26],
    stopLoss: 1,
    enterMargin: 5,
    exitMargin: 4
  };
  options = Object.assign({}, defaultOptions, strategy);
  closeData = [];
  console.log('options', options);
}

function getStrategy() {
  return options;
}

async function shouldTrade(data) {
  closeData.push(data.close);

  let startIdx = closeData.length - 1 - options.period[0];
  startIdx = (startIdx > 0) ? startIdx : 0;
  let baseConfig = {
    startIdx,
    endIdx: closeData.length - 1,
    inReal: closeData,
    optInTimePeriod: options.period[0]
  }
  let talibConf = getTalibConfig(baseConfig, 'sma');
  data.sma1 = await talib_calc(talibConf[0]);
  data.sma2 = await talib_calc(talibConf[1]);
  if (!data.sma1 || !data.sma2) return;

  return when.promise((resolve, reject) => {
    let action = actionForStrategy('sma', data);
    return resolve(action);
  })
}

function simpleSmaStrategy(data) {
  return getAction({
    should_enter: data.sma1 > data.sma2,
    should_exit: data.sma1 < data.sma2
  });
}

function smaStrategy(data) {
  let last_order = history.getLastOrder();
  let last_order_position = _.get(last_order, 'position');
  let sell_price = data.close - (data.close * .0016);

  let should_enter = (data.sma1 - data.sma2) > (data.sma2 * options.enterMargin/100);
  let should_exit = (data.sma2 - data.sma1) > (data.sma2 * options.exitMargin/100);

  let stop_loss;
  if (last_order_position === 'enter' &&
    last_order.price > (sell_price + (sell_price * (options.stopLoss / 100)))) {
    stop_loss = true;
  }

  return getAction({
    should_enter,
    should_exit,
    stop_loss
  });
}

function priceSmaStrategy(data) {
  let last_order = history.getLastOrder();
  let last_order_position = _.get(last_order, 'position');
  let last_order_stop_loss = _.get(last_order, 'stop_loss')

  let buy_price = data.close + (data.close * .0016);
  let sell_price = data.close - (data.close * .0016);

  let should_enter = (data.sma2 - buy_price) > (buy_price * .075);
  let should_exit = (sell_price - data.sma1) > (sell_price * .075);

  let stop_loss;
  if (last_order_position === 'enter' &&
    last_order.price > (sell_price * 1.01)) {
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

function actionForStrategy(strategy, data) {
  let action;
  switch (strategy) {
    case 'simple_sma':
      action = simpleSmaStrategy(data);
      break;
    case 'sma':
      action = smaStrategy(data);
      break;
    case 'price_sma':
      action = priceSmaStrategy(data);
      break;
  }
  return action;
}

function getAction(options) {
  let action;
  if (options.stop_loss) {
    action = 'stop_loss';
  } else if (options.should_enter) {
    action = 'enter';
  } else if(options.should_exit) {
    action = 'exit';
  }
  return action;
}

function getTalibConfig(baseConfig, strategy) {
  let result;
  switch (strategy) {
    case 'sma':
      result = getSmaTalibConfig(baseConfig);
      break;
    case 'price_sma':
      result = getSmaTalibConfig(baseConfig);
      result[0].optInTimePeriod = 7;
      result[1].optInTimePeriod = 21;
      break;

  }
  return result;
}

function getSmaTalibConfig(baseConfig) {
  let result = [];
  let sma1 = Object.assign(
    {},
    baseConfig,
    {
      name: 'SMA',
      optInTimePeriod: options.period[0]
    }
  );
  let sma2 = Object.assign(
    {},
    baseConfig,
    {
      name: 'SMA',
      optInTimePeriod: options.period[1],
    }
  );
  result.push(sma1, sma2);
  return result;
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
  shouldTrade,
  setStrategy,
  getStrategy
}
