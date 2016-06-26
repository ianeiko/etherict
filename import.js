/*
////////////////////////////////////

npm run import -- --from=6/16/16 --to=6/23/16
npm run import -- --days=7

////////////////////////////////////
*/

var _ = require('lodash');
var request = require('request');
var fs = require('fs');
var args = require('yargs');
var json2csv = require('json2csv');

var MINUTES_5 = 5 * 60;
var HOURS_24 = 24 * 60 * 60;
var currency_pair = 'BTC_ETH'; // or USDT_ETH; full list: https://poloniex.com/public?command=returnCurrencies

var start_date = Math.round(new Date() / 1000) - HOURS_24; // 24 hours ago
var end_date;
var period = MINUTES_5;
var api_base_url = `https://poloniex.com/public?command=returnChartData&currencyPair=${currency_pair}&period=${period}`;

var DATA_DIR = 'data';
var DATA_DEST = `${DATA_DIR}/${currency_pair}`;
var EXPORT_CSV = false;

function fetch_data() {
  var api_url = api_base_url + `&start=${start_date}`;
  api_url = (end_date) ? api_url + `&end=${end_date}` : api_url;

  console.log('api_url', api_url);
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

var start_period = _.get(args, 'argv.from');
var end_period = _.get(args, 'argv.to');
var days_period = _.get(args, 'argv.days');
if(start_period || end_period) {
  start_date = (start_period) ? Math.round(new Date(start_period).getTime() / 1000) : null;
  end_date = (end_period) ? Math.round(new Date(end_period).getTime() / 1000) : null;
  console.log('start/end time: ', start_date, end_date);
  console.log('start/end periods: ', start_period, end_period);
} else {
  const START_DAYS = days_period || 7;
  start_date = start_date - (HOURS_24 * START_DAYS);
  end_period = '9999999999';
  console.log('fetching OHLC data')
}

fetch_data();
