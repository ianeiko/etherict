const ubique = require('ubique');

let x = [500, 750, 400, 600, 350, 800];
let delta = x.map((num, key) => {
  if (key === 0) return 0;
  let last = x[key-1];
  return (num - last) / last;
})

let result = ubique.drawdown(delta);
console.log(delta);
console.log(result);
