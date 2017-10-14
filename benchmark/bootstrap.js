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
  const serverConf = {
    "service": "tcp://localhost:1082",
    "key": "JJ9,$!.!sRG==v7$",
    "presets": presets,
    // "tls_key": "key.pem",
    // "tls_cert": "cert.pem"
    "log_level": "error"
  };
  const clientConf = {
    "service": "tcp://127.0.0.1:1081",
    // "tls_cert": "cert.pem"
    "dstaddr": {
      "host": "127.0.0.1",
      "port": 1083
    },
    "servers": [Object.assign({}, serverConf, {"enabled": true})],
    "log_level": "error"
  };
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
  const matches = stdout.match(/\[SUM].*sec/g);
  if (matches === null) {
    console.error(stdout);
  }
  return matches.slice(-2).map((line) => {
    const [interval, transfer, bitrate] = line.match(/\d+[.\d\-\s]+\w+[\/\w]+/g);
    return {interval, transfer, bitrate};
  });
}

function convertTransferToKBytes(transfer) {
  const [num, unit] = transfer.split(' ');
  const factor = {
    'Gbits/sec': 1024 * 1024,
    'Mbits/sec': 1024,
    'Kbits/sec': 1
  }[unit];
  return num * factor;
}

function printTestEnv() {
  console.log(chalk.bold.underline('blinksocks version:'));
  console.log(child_process.execFileSync('blinksocks', ['-v'], {encoding: 'utf-8'}).trim());
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
        IPERF_PATH, [clientJson, serverJson, SEC_PER_CASE.toString()], {encoding: 'utf-8'}
      );
      const [a, b] = parseStdout(stdout);
      console.log(`------------ ${chalk.green(`Test Case ${i}`)} ----------------`);
      console.log(JSON.stringify(presets));
      console.log('Interval         Transfer     Bitrate');
      console.log(`${a.interval}  ${a.transfer}  ${a.bitrate}  sender`);
      console.log(`${b.interval}  ${b.transfer}  ${b.bitrate}  receiver`);
      console.log('-----------------------------------------');
      console.log('');
      const conv = convertTransferToKBytes;
      results.push({
        id: i,
        bitrates: [a.bitrate, b.bitrate],
        recvBitrate: conv(b.bitrate),
        conf: JSON.stringify(presets)
      });
    } catch (err) {
      console.error(err);
    }
  }
  return results;
}

function summary(results) {
  const sorted = [].concat(results).sort((a, b) => b.recvBitrate - a.recvBitrate);
  console.log('(ranking):');
  console.log('');
  for (let i = 0; i < sorted.length; ++i) {
    const {id, bitrates, conf} = sorted[i];
    console.log(`${(i + 1).toString().padStart(2)}: Test Case ${id}, Bitrate=[${bitrates.join(', ')}], ${conf}`);
  }
  console.log('');
}

printTestEnv();

console.log('running tests...');
console.log('');

summary(run(testCases));
