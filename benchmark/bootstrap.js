#!/usr/bin/env node
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const testCases = require('./cases');

const IPERF_PATH = path.join(__dirname, 'iperf.sh');
const SEC_PER_CASE = 3;

function makeConfs(presets) {
  const common = {
    "dns": [],
    "dns_expire": 3600,
    "timeout": 600,
    "watch": false,
    "log_level": "error"
  };
  const server = {
    "transport": "tcp",
    "host": "127.0.0.1",
    "port": 1082,
    "key": "JJ9,$!.!sRG==v7$",
    "presets": presets
  };
  const clientConf = Object.assign({
    "host": "127.0.0.1",
    "port": 1081,
    "servers": [
      Object.assign({}, server, {
        "enabled": true,
        "presets": [{
          "name": "proxy", // proxy in tunnel mode
          "params": {
            "host": "127.0.0.1",
            "port": 1083
          }
        }].concat(server.presets)
      })
    ]
  }, common);
  const serverConf = Object.assign({}, server, common);
  return [clientConf, serverConf];
}

function writeConfs(caseId, presets) {
  const [clientConf, serverConf] = makeConfs(presets);
  const clientJson = path.join(__dirname, `jsons/case-${caseId}-client.json`);
  const serverJson = path.join(__dirname, `jsons/case-${caseId}-server.json`);
  fs.writeFileSync(clientJson, JSON.stringify(clientConf, null, '  '));
  fs.writeFileSync(serverJson, JSON.stringify(serverConf, null, '  '));
  return [clientJson, serverJson];
}

function parseStdout(stdout) {
  const matches = stdout.match(/\[\s{2}\d].*sec/g);
  return matches.map((line) => {
    const [interval, transfer, bandwidth] = line.match(/\d+[.\d\-\s]+\w+[\/\w]+/g);
    return {interval, transfer, bandwidth};
  });
}

function run(cases) {
  const results = [];
  for (const {id, presets} of cases) {
    const [clientJson, serverJson] = writeConfs(id, presets);
    try {
      const stdout = child_process.execFileSync(
        IPERF_PATH, [clientJson, serverJson, SEC_PER_CASE.toString()], {encoding: 'utf-8'}
      );
      const result = {id, itb: parseStdout(stdout)};
      results.push(result);
      printTable(result);
    } catch (err) {
      console.error(err);
    }
  }
  return results;
}

function parseBandwidth(bandwidth) {
  const [num, unit] = bandwidth.split(' ');
  const factor = {
    'Gbits/sec': 1024 * 1024,
    'Mbits/sec': 1024,
    'Kbits/sec': 1
  }[unit];
  return num * factor;
}

function printTable(result) {
  const {id, itb: [a, b]} = result;
  console.log(`------------ ${chalk.green(`Test Case ${id}`)} ----------------`);
  console.log(JSON.stringify(testCases[id].presets));
  console.log('Interval       Transfer       Bandwidth');
  console.log(`${a.interval}  ${a.transfer}  ${a.bandwidth}`);
  console.log(`${b.interval}  ${b.transfer}  ${b.bandwidth}`);
  console.log('-----------------------------------------\n');
}

function printSystemConf() {
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

function summary(results) {
  let maxBandwidth = 0;
  let bestCaseId = 0;
  for (const result of results) {
    const {id, itb: [a, b]} = result;
    const ba = parseBandwidth(a.bandwidth);
    const bb = parseBandwidth(b.bandwidth);
    if (ba > maxBandwidth) {
      maxBandwidth = ba;
      bestCaseId = id;
    }
    if (bb > maxBandwidth) {
      maxBandwidth = bb;
      bestCaseId = id;
    }
    // printTable(result);
  }
  console.log('(best):\n');
  printTable(results[bestCaseId]);
}

printSystemConf();

console.log('running tests...\n');

summary(run(testCases));
