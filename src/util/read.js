const _ = require('lodash');

function getStrategies(strategy) {
  strategy = _.pick(strategy, 'system', 'period', 'frequency', 'month', 'stoploss');
  const periods = _
    .chain(strategy.period)
    .split(',')
    .map(n => {
      let result = [];
      if (n.indexOf('...') > -1) {
        const arr = _.split(n, '...');
        const range = _.range(parseInt(arr[0]), parseInt(arr[1]) + 1);
        return range;
      } else {
        result = parseInt(n);
      }
      return result;
    })
    .thru(current => {
      if (_.isArray(current[0]) && _.isArray(current[1])) {
        return allArrays(current[0], current[1]);
      } else {
        return [current];
      }
    })
    .value();

  if (_.get(strategy, 'system') && strategy.system.indexOf(',') === -1) {
    strategy.system = [strategy.system];
  } else if(_.get(strategy, 'system') && !_.isArray(strategy.system)) {
    strategy.system = strategy.system.split(',').map(w => w.trim());
  }

  if (_.get(strategy, 'stoploss') && strategy.stoploss.indexOf(',') === -1) {
    strategy.stoploss = [strategy.stoploss];
  } else if(_.get(strategy, 'stoploss') && !_.isArray(strategy.stoploss)) {
    strategy.stoploss = strategy.stoploss.split(',').map(w => w.trim());
  }

  if (_.get(strategy, 'month') && _.isNumber(strategy.month)) {
    strategy.month = [strategy.month];
  } else if(_.get(strategy, 'month')
    && !_.isArray(strategy.month)
    && strategy.month.toString().indexOf(',') > -1) {
    strategy.month = strategy.month.split(',').map(w => w.trim());
  }

  strategy.period = periods;
  const comboFields = ['month', 'system', 'period', 'stoploss'];
  const strategyPart = _.pick(strategy, comboFields);
  const strategyRest = _.omit(strategy, comboFields);
  const pairs = getPairs(strategyPart);
  const combos = getCombinations(pairs);
  const result = mergeStrategy(combos, strategyRest);
  return result;
}

function allArrays(left, right) {
  const result = [];
  for (let i = 0; i < left.length; i++) {
    for (let j = 0; j < right.length; j++) {
      result.push([left[i], right[j]]);
    }
  }
  return result;
}

function getCombinations(args) {
  return _.reduce(args, (a, b) => {
    return _.flatten(_.map(a, (x) => {
      return _.map(b, (y) => {
        return _.concat(x, [y]);
      });
    }), true);
  }, [[]]);
}

function getPairs(input) {
  const keys = _.keys(input);
  const pairs = _.reduce(keys, (acc, key) => {
    const values = input[key];
    const result = _.map(values, (val, idx) => {
      return { [key]: values[idx] };
    });
    return _.concat(acc, [result]);
  }, []);
  return pairs;
}

function mergeStrategy(combos, strategy) {
  return _.map(combos, (combo) => {
    const result = _.reduce(combo, (acc, item) => {
      const keys = _.keys(item);
      const values = _.values(item);
      const result = { [keys[0]]: values[0] };
      return _.merge(acc, result);
    }, {});
    return _.assign({}, strategy, result);
  });
}

module.exports = {
  getStrategies
};
