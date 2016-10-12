const _ = require('lodash');

function getStrategies(strategy) {
  strategy = _.pick(strategy, 'system', 'period', 'frequency');
  let result = [];
  let periods = _
    .chain(strategy.period)
    .split(',')
    .map(n => {
      let result = [];
      if (n.indexOf('...') > -1) {
        let arr = _.split(n, '...');
        let range = _.range(parseInt(arr[0]), parseInt(arr[1]) + 1);
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

  if(!_.isArray(strategy.system)) {
    strategy.system = strategy.system.split(',').map(w => w.trim());
  }

  strategy.system.map(system => {
    periods.map(period => {
      result.push(_.extend(
        {},
        strategy,
        { period, system }
      ))
    })
  });
  return result;
}

function allArrays(left, right) {
  let result = [];
  for (var i = 0; i < left.length; i++) {
    for (var j = 0; j < right.length; j++) {
      result.push([left[i], right[j]])
    }
  }
  return result;
}


let options = { system: 'sma ,   simple_sma', period: '5...5,12...13', frequency: '288' }
// let options = { strategy: 'sma', period: '3...23,8...28', frequency: '288' }
let result = getStrategies(options);
console.log(result);
