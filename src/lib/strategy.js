const _ = require('lodash')
const when = require('when');
const talib = require('talib');

class Strategy {
  constructor(strategy, history) {
    let defaultOptions = {
      period: [9, 26],
      stoploss: 1,
      enterMargin: 5,
      exitMargin: 4
    };
    this.options = Object.assign({}, defaultOptions, strategy);
    this.history = history;
    this.closeData = [];
  }
  async shouldTrade(data) {
    this.closeData.push(data.close);

    let startIdx = this.closeData.length - 1 - this.options.period[0];
    startIdx = (startIdx > 0) ? startIdx : 0;
    let baseConfig = {
      startIdx,
      endIdx: this.closeData.length - 1,
      inReal: this.closeData,
      // optInTimePeriod: this.options.period[0]
    }
    let talibConf = this.getTalibConfig(baseConfig, this.options.system);
    if (this.options.system === 'macd') {
      data.macd = await talib_calc(talibConf);
      data.macd = {
        line: _.last(data.macd.result.outMACD),
        signal: _.last(data.macd.result.outMACDSignal)
      }
    } else {
      data.sma1 = await talib_calc(talibConf[0]);
      console.log('data', data);
      data.sma1 = _.last(data.sma1.result.outReal);
      data.sma2 = await talib_calc(talibConf[1]);
      data.sma2 = _.last(data.sma2.result.outReal);
      if (!data.sma1 || !data.sma2) return;
    }

    return when.promise((resolve, reject) => {
      let action = this.actionForStrategy(this.options.system, data);
      return resolve(action);
    })
  }

  simpleSmaStrategy(data) {
    return this.getAction({
      should_enter: data.sma1 > data.sma2,
      should_exit: data.sma1 < data.sma2
    });
  }

  macdStrategy(data) {
    let last_order = this.history.getLastOrder();
    let last_order_position = _.get(last_order, 'position');
    let sell_price = data.close - (data.close * .0016);

    let should_enter = data.macd.signal < 0;
    let should_exit = data.macd.signal > 0;

    if (should_exit) {
      console.log('should_exit', data.macd);
    }
    if (should_enter) {
      console.log('should_exit', data.macd);
    }

    // let should_enter = (data.sma1 - data.sma2) > (data.sma2 * this.options.enterMargin/100);
    // let should_exit = (data.sma2 - data.sma1) > (data.sma2 * this.options.exitMargin/100);

    let stop_loss;
    if (last_order_position === 'enter' &&
      last_order.price > (sell_price + (sell_price * (this.options.stoploss / 100)))) {
      stop_loss = true;
    }
    return this.getAction({
      should_enter,
      should_exit,
      // stop_loss
    });
  }

  smaStrategy(data) {
    let last_order = this.history.getLastOrder();
    let last_order_position = _.get(last_order, 'position');
    let sell_price = data.close - (data.close * .0016);

    let should_enter = (data.sma1 - data.sma2) > (data.sma2 * this.options.enterMargin/100);
    let should_exit = (data.sma2 - data.sma1) > (data.sma2 * this.options.exitMargin/100);

    let stop_loss;
    if (last_order_position === 'enter' &&
      last_order.price > (sell_price + (sell_price * (this.options.stoploss / 100)))) {
      stop_loss = true;
    }
    return this.getAction({
      should_enter,
      should_exit,
      stop_loss
    });
  }

  priceSmaStrategy(data) {
    let last_order = this.history.getLastOrder();
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

    return this.getAction({
      should_enter,
      should_exit,
      stop_loss
    });
  }

  actionForStrategy(strategy, data) {
    let action;
    switch (strategy) {
      case 'simple_sma':
        action = this.simpleSmaStrategy(data);
        break;
      case 'sma':
        action = this.smaStrategy(data);
        break;
      case 'price_sma':
        action = this.priceSmaStrategy(data);
        break;
      case 'macd':
        action = this.macdStrategy(data);
        break;
    }
    return action;
  }

  getAction(options) {
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

  getTalibConfig(baseConfig, strategy) {
    let result;
    switch (strategy) {
      case 'simple_sma':
      case 'sma':
        result = this.getSmaTalibConfig(baseConfig);
        break;
      case 'price_sma':
        result = this.getSmaTalibConfig(baseConfig);
        result[0].optInTimePeriod = 7;
        result[1].optInTimePeriod = 21;
        break;
      case 'macd':
        result = this.getMacdTalibConfig(baseConfig);
        break;
    }
    return result;
  }

  getMacdTalibConfig(baseConfig) {
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

  getSmaTalibConfig(baseConfig) {
    let result = [];
    let sma1 = Object.assign(
      {},
      baseConfig,
      {
        name: 'SMA',
        optInTimePeriod: this.options.period[1]
      }
    );
    let sma2 = Object.assign(
      {},
      baseConfig,
      {
        name: 'SMA',
        optInTimePeriod: this.options.period[0],
      }
    );
    result.push(sma1, sma2);
    return result;
  }
}

function talib_calc(parameter){
  return new Promise((resolve, reject) => {
    talib.execute(parameter, function(result){
      resolve(result);
    })
  })
}

module.exports = Strategy;


// module.exports = {
//   shouldTrade,
//   setStrategy,
//   getStrategy
// }
