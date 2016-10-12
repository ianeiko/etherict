const ubique = require('ubique');

// let x = [100, 150, 90, 120, 80, 200];
let x  = [50, -60, 30, -40, 120];

let result = ubique.drawdown(x);
let start = result.maxddrecov[0];
let end = result.maxddrecov[1];
console.log(result);
console.log(x[start-1]);
console.log(x[end-1]);
