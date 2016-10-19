/*
////////////////////////////////////

single file:
npm run import -- --from=3/1/16 --to=10/1/16
npm run import -- --days=7

files by month:
npm run import -- --from_month=3 --to_month=10

////////////////////////////////////
*/

const _ = require('lodash');
const request = require('request');
const fs = require('fs');
const args = require('yargs');
const json2csv = require('json2csv');
const moment = require('moment');

const MINUTES_5 = 5 * 60;
const HOURS_24 = 24 * 60 * 60;

const API_BASE_URL = 'https://poloniex.com/public?command=returnChartData';
const DATA_DIR = 'data';
const EXPORT_CSV = false;

// == START FETCHING!
init();
// ==

function init() {
  const options = parseArguments();
  const defaultOptions = {
    currency_pair: 'BTC_ETH', // https://poloniex.com/public?command=returnCurrencies
    period: MINUTES_5,
    start_date: Math.round(new Date() / 1000) - HOURS_24, // 24 hours ago
  };
  _.each(options, set => {
    set = Object.assign({}, defaultOptions, set);
    console.log('calling fetch data with: ', set);
    fetch_data(buildUrl(set), buildDest(set));
  });
}

function fetch_data(url, dest) {
  request(url, (err, response, body) => {
    if(err) throw err;
    const parsedBody = JSON.parse(body);
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
  const fields = ['date', 'high', 'low', 'open', 'close', 'volume', 'quoteVolume', 'weightedAverage'];
  json2csv({ data: parsedBody, fields: fields }, (err, csv) => {
    if (err) console.log(err);

    fs.writeFile(`${dest}.csv`, csv, (err) => {
      if(err) throw err;

      console.log(`Added ${parsedBody.length} records to ${dest}.csv`);
    });
  });
}

function buildDest(options) {
  let result = `${DATA_DIR}/${options.currency_pair}`;
  if (options.period_name) {
    result = `${result}_${options.period_name}`;
  }
  return result;
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
  const result = [];
  let start_date;
  let end_date;
  const start_arg = _.get(args, 'argv.from');
  const end_arg = _.get(args, 'argv.to');
  const days_arg = _.get(args, 'argv.days');
  const from_month_arg = _.get(args, 'argv.from_month');
  const to_month_arg = _.get(args, 'argv.to_month');
  if(start_arg && end_arg) {
    start_date = dateToTime(start_arg);
    end_date = dateToTime(end_arg);
  } else if (from_month_arg && to_month_arg) {
    start_date = [];
    end_date = [];
    for (let i = from_month_arg; i < to_month_arg; i++) {
      const result = monthToTime(i);
      start_date.push(result[0]);
      end_date.push(result[1]);
    }
  } else {
    const START_DAYS = days_arg || 7;
    if (start_arg) {
      start_date = start_arg - (HOURS_24 * START_DAYS);
    }
    end_date = '9999999999';
  }

  if (_.isArray(start_date)
    && _.isArray(end_date)
    && start_date.length === end_date.length) {
    for (let i = 0; i < start_date.length; i++) {
      const period_name = from_month_arg + i;
      result.push(buildDateOptions(start_date[i], end_date[i], period_name));
    }
  } else {
    result.push(buildDateOptions(start_date, end_date));
  }
  return result;
}

function buildDateOptions(start_date, end_date, period_name) {
  const result = {
    start_date,
    end_date,
    period_name
  };
  return _.omitBy(result, _.isNil);
}

function monthToTime(month) {
  const start = moment().month(month - 1).format('X');
  const end = moment().month(month).format('X');
  return [start, end];
}

function dateToTime(date) {
  return Math.round(new Date(date).getTime() / 1000);
}
