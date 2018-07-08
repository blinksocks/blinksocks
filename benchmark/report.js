#!/usr/bin/env node
const child_process = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');
const chalk = require('chalk');
const formatSize = require('filesize');
const glob = require('fast-glob');

const readFile = util.promisify(fs.readFile);

const BLINKSOCKS_PATH = path.resolve(__dirname, '../bin/start.js');
const options = process.argv.slice(2);

function format(item) {
  const { entry, description, sum_received } = item;
  const { start, end, bytes, bits_per_second } = sum_received;
  return {
    file: entry.replace('benchmark/', ''),
    description: description,
    interval: start.toFixed(2) + '-' + end.toFixed(2) + ' sec',
    transfer: formatSize(bytes) + 'ytes',
    bitrate: formatSize(bits_per_second / 8, { bits: true }) + 'its/sec',
  };
}

function printEnv() {
  console.log(chalk.bold.underline('blinksocks:'));
  console.log('%s %s', 'version'.padEnd(15), child_process.execSync(`node --no-warnings ${BLINKSOCKS_PATH} -v`, { encoding: 'utf-8' }).trim());
  console.log('');
  console.log(chalk.bold.underline('Operating System:'));
  const osParams = [
    ['cpu', os.cpus()[0].model],
    ['cores', os.cpus().length],
    ['memory', os.totalmem()],
    ['type', os.type()],
    ['platform', os.platform()],
    ['arch', os.arch()],
    ['release', os.release()]
  ];
  for (const [key, value] of osParams) {
    console.log('%s %s', key.padEnd(15), value);
  }
  console.log('');
  console.log(chalk.bold.underline('Node.js Versions:'));
  for (const [key, value] of Object.entries(process.versions)) {
    console.log('%s %s', key.padEnd(15), value);
  }
  console.log('');
}

async function main() {
  printEnv();
  const patterns = options;

  if (patterns.length < 1) {
    return console.error('please provide at least one glob pattern');
  }

  const entries = (await glob(patterns)).filter(pattern => pattern.endsWith('.bench.json'));
  if (entries.length < 1) {
    return console.error(chalk.red('No ".bench.json" found, please "npm run benchmark" first.'));
  }

  let results = [];
  for (const entry of entries) {
    const txt = await readFile(entry);
    const cases = JSON.parse(txt);

    for (const item of cases) {
      results.push({ _format: format(item), ...item });
    }
  }

  results.sort((a, b) => b.sum_received.bits_per_second - a.sum_received.bits_per_second);

  console.log('(ranking):');
  console.log('');
  console.table(results.map(item => item._format));
}

main();
