#!/usr/bin/env node
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const formatSize = require('filesize');
const mkdirp = require('mkdirp');
const testCases = require('./cases');

const BLINKSOCKS_PATH = path.resolve(__dirname, '../bin/start.js');
const IPERF_PATH = path.join(__dirname, 'iperf.sh');
const SEC_PER_CASE = 3;

function makeConfs(presets) {
  const serverConf = {
    'service': 'tcp://localhost:1082',
    'key': 'JJ9,$!.!sRG==v7$',
    'presets': presets,
    'tls_key': 'key.pem',
    'tls_cert': 'cert.pem',
    'log_level': 'error',
    'mux': false,
    'mux_concurrency': 10,
  };
  const clientConf = {
    'service': 'tcp://127.0.0.1:1081?forward=127.0.0.1:1083',
    'tls_cert': 'cert.pem',
    'servers': [Object.assign({}, serverConf, { 'enabled': true })],
    'log_level': 'error',
  };
  return [clientConf, serverConf];
}

function writeConfs(caseId, presets) {
  const [clientConf, serverConf] = makeConfs(presets);
  mkdirp.sync(path.join(__dirname, `jsons`));
  const clientJson = path.join(__dirname, `jsons/case-${caseId}-client.json`);
  const serverJson = path.join(__dirname, `jsons/case-${caseId}-server.json`);
  fs.writeFileSync(clientJson, JSON.stringify(clientConf, null, '  '));
  fs.writeFileSync(serverJson, JSON.stringify(serverConf, null, '  '));
  return [clientJson, serverJson];
}

function parseStdout(stdout) {
  try {
    const report = JSON.parse(stdout);
    return [report.end.sum_sent, report.end.sum_received];
  } catch (err) {
    console.log(err);
  }
  return null;
}

function formatResult({ start, end, bytes, bits_per_second }) {
  return {
    interval: start.toFixed(2) + '-' + end.toFixed(2) + ' sec',
    transfer: formatSize(bytes) + 'ytes',
    bitrate: formatSize(bits_per_second / 8, { bits: true }) + 'its/sec',
  };
}

function printEnv() {
  console.log(chalk.bold.underline('blinksocks:'));
  console.log('%s %s', 'version'.padEnd(15), child_process.execSync(`node ${BLINKSOCKS_PATH} -v`, { encoding: 'utf-8' }).trim());
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

function run(cases) {
  const results = [];
  for (let i = 0; i < cases.length; ++i) {
    const presets = cases[i];
    const [clientJson, serverJson] = writeConfs(i, presets);
    try {
      const stdout = child_process.execFileSync(
        IPERF_PATH, [clientJson, serverJson, SEC_PER_CASE.toString()], { encoding: 'utf-8' }
      );
      const parsed = parseStdout(stdout);
      if (parsed === null) {
        console.log(`Test Case ${i} ${chalk.red('failed')}`);
        console.log('');
        continue;
      }
      const [a, b] = parsed.map(formatResult);
      console.log(`------------ ${chalk.green(`Test Case ${i}`)} ----------------`);
      console.log(JSON.stringify(presets));
      console.log('Interval         Transfer     Bitrate');
      console.log(`${a.interval}  ${a.transfer}  ${a.bitrate}  sender`);
      console.log(`${b.interval}  ${b.transfer}  ${b.bitrate}  receiver`);
      console.log('-----------------------------------------');
      console.log('');
      results.push({
        id: i,
        bitrates: [a.bitrate, b.bitrate],
        config: JSON.stringify(presets),
        _sortBy: parsed[1].bits_per_second,
      });
    } catch (err) {
      console.error(err);
    }
  }
  return results;
}

function printRanking(results) {
  const sorted = [].concat(results).sort((a, b) => b._sortBy - a._sortBy);
  console.log('(ranking):');
  console.log('');
  for (let i = 0; i < sorted.length; ++i) {
    const { id, bitrates, config } = sorted[i];
    console.log(`${(i + 1).toString().padStart(2)}: Test Case ${id}, Bitrate = ${bitrates.join(', ')}`);
    console.log(`    ${config}`);
  }
  console.log('');
}

printEnv();

console.log(`running ${testCases.length} tests...`);
console.log('');

const results = run(testCases);

printRanking(results);
