// var allArrays = [['5', '15'], ['6', '16'], ['7', '17']]
// let left = [5, 6, 7, 8];
// let right = [15, 16, 17];
const _ = require('lodash');
let strategy = {
  name: 'sma',
  period: '5...8,15...18'
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

let strategies = _
  .chain(strategy.period)
  .split(',')
  .map(n => {
    let result = [];
    if (n.indexOf('...')) {
      let arr = _.split(n, '...');
      return _.range(parseInt(arr[0]), parseInt(arr[1]));
    } else {
      result = parseInt(n);
    }
    console.log('foo');
    return result;
  })
  .thru(current => {
    return allArrays(current[0], current[1]);
  })
  .map(arr => {
    return _.extend(
      {},
      strategy,
      { period: arr }
    );
  })
  .value();

console.log('strategies', strategies);
