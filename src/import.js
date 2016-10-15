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

const API_BASE_URL = 'https://poloniex.com/public?command=returnChartData';
const DATA_DIR = 'data';
const EXPORT_CSV = false;

// == START FETCHING!
init();
// ==

function init() {
  let options = parseArguments();
  const defaultOptions = {
    currency_pair: 'BTC_ETH', // https://poloniex.com/public?command=returnCurrencies
    period: MINUTES_5,
    start_date: Math.round(new Date() / 1000) - HOURS_24, // 24 hours ago
  };
  options = Object.assign({}, defaultOptions, options);
  let url = buildUrl(options);
  let dest = buildDest(options);
  console.log('calling fetch data with: ', options);
  fetch_data(url, dest);
}

function fetch_data(url, dest) {
  request(url, (err, response, body) => {
    if(err) throw err;
    let parsedBody = JSON.parse(body);
    if(parsedBody.length <= 0) return;
    writeData(body, parsedBody, dest);
  });
}

function writeData(rawBody, parsedBody, dest) {
  fs.writeFile(`${dest}.json`, rawBody, (err) => {
    if(err) throw err;

    console.log(`Added ${parsedBody.length} records to ${dest}.json`);
  });

  if(EXPORT_CSV) {
    exportCsv(parsedBody, dest);
  }
}

function exportCsv(parsedBody, dest) {
  let fields = ['date', 'high', 'low', 'open', 'close', 'volume', 'quoteVolume', 'weightedAverage'];
  json2csv({ data: parsedBody, fields: fields }, function(err, csv) {
    if (err) console.log(err);

    fs.writeFile(`${dest}.csv`, csv, (err) => {
      if(err) throw err;

      console.log(`Added ${parsedBody.length} records to ${dest}.csv`);
    });
  });
}

function buildDest(options) {
  return `${DATA_DIR}/${options.currency_pair}`;
}

function buildUrl(options) {
  let result = API_BASE_URL;
  if (options.start_date) {
    result = `${result}&start=${options.start_date}`;
  }
  if (options.currency_pair) {
    result = `${result}&currencyPair=${options.currency_pair}`;
  }
  if (options.period) {
    result = `${result}&period=${options.period}`;
  }
  if (options.end_date) {
    result = `${result}&end=${options.end_date}`;
  }
  return result;
}

function parseArguments() {
  let start_date;
  let end_date;
  const start_arg = _.get(args, 'argv.from');
  const end_arg = _.get(args, 'argv.to');
  const days_period = _.get(args, 'argv.days');
  if(start_arg && end_arg) {
    start_date = dateToTime(start_arg);
    end_date = dateToTime(end_arg);
  } else {
    const START_DAYS = days_period || 7;
    if (start_arg) {
      start_date = start_arg - (HOURS_24 * START_DAYS);
    }
    end_date = '9999999999';
  }
  let result = {
    start_date,
    end_date
  };
  return _.omitBy(result, _.isNil);
}

function dateToTime(date) {
  return Math.round(new Date(date).getTime() / 1000);
}
