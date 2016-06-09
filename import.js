var request = require('request');
var fs = require('fs');
var json2csv = require('json2csv');

var MINUTES_5 = 5 * 60;
var HOURS_24 = 24 * 60 * 60;
var currency_pair = 'BTC_ETH'; // or USDT_ETH; full list: https://poloniex.com/public?command=returnCurrencies

var start_date = Math.round(new Date() / 1000) - HOURS_24; // 24 hours ago
var period = MINUTES_5;
var api_base_url = `https://poloniex.com/public?command=returnChartData&currencyPair=${currency_pair}&end=9999999999&period=${period}`;

var DATA_DIR = 'data';
var DATA_DEST = `${DATA_DIR}/${currency_pair}`;
var EXPORT_CSV = false;

function fetch_data() {
  var api_url = api_base_url + `&start=${start_date}`;
  request(api_url, (err, response, body) => {
    if(err) throw err;

    var parsedBody = JSON.parse(body);
    if(parsedBody.length <= 0) return;

    fs.writeFile(`${DATA_DEST}.json`, body, (err) => {
      if(err) throw err;

      console.log(`Added ${parsedBody.length} records to ${DATA_DEST}.json`);
    });

    if(EXPORT_CSV) {
      var fields = ['date', 'high', 'low', 'open', 'close', 'volume', 'quoteVolume', 'weightedAverage'];
      json2csv({ data: parsedBody, fields: fields }, function(err, csv) {
        if (err) console.log(err);

        fs.writeFile(`${DATA_DEST}.csv`, csv, (err) => {
          if(err) throw err;

          console.log(`Added ${parsedBody.length} records to ${DATA_DEST}.csv`);
        });
      });
    }
  });
}

function fetch_spread() {
  currency_pair = 'XETHXXBT';
  api_url = `https://api.kraken.com/0/public/Spread?pair=${currency_pair}`;
  DATA_DEST = `${DATA_DIR}/${currency_pair}`;
  request(api_url, (err, response, body) => {
    if(err) throw err;
    var parsedBody = JSON.parse(body)['result'][currency_pair];
    if(parsedBody.length <= 0) return;

    fs.writeFile(`${DATA_DEST}.json`, parsedBody, (err) => {
      if(err) throw err;

      console.log(`Added ${parsedBody.length} records to ${DATA_DEST}.json`);
    });
  });
}

if (process.env.FETCH_SPREAD){
  console.log('fetching spread data')
  fetch_spread();
} else {
  const START_DAYS = process.env.DAYS || 7;
  start_date = start_date - (HOURS_24 * START_DAYS);
  console.log('fetching OHLC data')
  fetch_data();
}
