var request = require('request');
var fs = require('fs');

var MINUTES_5 = 5 * 60;
var HOURS_24 = 24 * 60 * 60;
var currency_pair = 'BTC_ETH'; // or USDT_ETH; full list: https://poloniex.com/public?command=returnCurrencies

var start_date = Math.round(new Date() / 1000) - HOURS_24; // 24 hours ago
var period = MINUTES_5;
var api_base_url = `https://poloniex.com/public?command=returnChartData&currencyPair=${currency_pair}&end=9999999999&period=${period}`;

var DATA_DIR = 'data';
var DATA_DEST = `${DATA_DIR}/${currency_pair}.json`;

function fetch_data() {
  var api_url = api_base_url + `&start=${start_date}`;
  request(api_url, (err, response, body) => {
    if(err) throw err;

    var parsedBody = JSON.parse(body);
    if(parsedBody.length <= 0) return;

    fs.writeFile(DATA_DEST, body, (err) => {
      if(err) throw err;

      console.log(`Added ${parsedBody.length} records to ${DATA_DEST}`);
    });
  });
}


start_date = start_date - (HOURS_24 * 90);
fetch_data(start_date);
