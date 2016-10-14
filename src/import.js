/*
////////////////////////////////////

npm run import -- --from=3/1/16 --to=10/1/16
npm run import -- --days=7

////////////////////////////////////
*/

const _ = require('lodash');
const request = require('request');
const fs = require('fs');
const args = require('yargs');
const json2csv = require('json2csv');

const MINUTES_5 = 5 * 60;
const HOURS_24 = 24 * 60 * 60;
const currency_pair = 'BTC_ETH'; // or USDT_ETH; full list: https://poloniex.com/public?command=returnCurrencies

let start_date = Math.round(new Date() / 1000) - HOURS_24; // 24 hours ago
let end_date;
const period = MINUTES_5;
const api_base_url = `https://poloniex.com/public?command=returnChartData&currencyPair=${currency_pair}&period=${period}`;

const DATA_DIR = 'data';
const DATA_DEST = `${DATA_DIR}/${currency_pair}`;
const EXPORT_CSV = false;

function fetch_data() {
  let api_url = api_base_url + `&start=${start_date}`;
  api_url = (end_date) ? api_url + `&end=${end_date}` : api_url;

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

const start_period = _.get(args, 'argv.from');
const end_period = _.get(args, 'argv.to');
const days_period = _.get(args, 'argv.days');
if(start_period || end_period) {
  start_date = (start_period) ? Math.round(new Date(start_period).getTime() / 1000) : null;
  end_date = (end_period) ? Math.round(new Date(end_period).getTime() / 1000) : null;
  console.log('start/end time: ', start_date, end_date);
  console.log('start/end periods: ', start_period, end_period);
} else {
  const START_DAYS = days_period || 7;
  start_date = start_date - (HOURS_24 * START_DAYS);
  end_date = '9999999999';
  console.log('fetching OHLC data')
}

fetch_data();
