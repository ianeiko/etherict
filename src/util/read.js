const _ = require('lodash');

function allArrays(left, right) {
  let result = [];
  for (let i = 0; i < left.length; i++) {
    for (let j = 0; j < right.length; j++) {
      result.push([left[i], right[j]]);
    }
  }
  return result;
}

function getStrategies(strategy) {
  strategy = _.pick(strategy, 'system', 'period', 'frequency', 'months');
  let result = [];
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

  if (strategy.system.indexOf(',') === -1) {
    strategy.system = [strategy.system];
  } else if(!_.isArray(strategy.system)) {
    strategy.system = strategy.system.split(',').map(w => w.trim());
  }

  if (_.isNumber(strategy.months)) {
    strategy.months = [strategy.months];
  } else if(!_.isArray(strategy.months) && strategy.months.indexOf(',') > -1) {
    strategy.months = strategy.months.split(',').map(w => w.trim());
  }

  strategy.months.map(month => {
    strategy.system.map(system => {
      periods.map(period => {
        result.push(_.extend(
          {},
          strategy,
          {
            period,
            system,
            month
          }
        ));
      });
    });
  });
  return result;
}

module.exports = {
  getStrategies
};
