#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const util = require('util');
const path = require('path');
const child_process = require('child_process');
const chalk = require('chalk');
const glob = require('fast-glob');

const IPERF_PATH = path.join(__dirname, 'iperf.sh');
const SEC_PER_CASE = 3;

const options = process.argv.slice(2);
const writeFile = util.promisify(fs.writeFile);

async function main() {
  const patterns = options;

  if (patterns.length < 1) {
    return console.error(chalk.red('please provide at least one glob pattern'));
  }

  const entries = (await glob(patterns)).filter(pattern => pattern.endsWith('.bench.js'));

  if (entries.length < 1) {
    return console.error(chalk.red('No ".bench.js" found.'));
  }

  for (const entry of entries) {
    const fname = path.basename(entry, '.bench.js');
    const configs = require(path.join(process.cwd(), entry))();
    const tmpDir = os.tmpdir();

    console.log(chalk.bgYellow.black('RUNS') + ' ' + entry);
    const results = [];
    const keys = Object.keys(configs);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const cjson = configs[key];
      const sjson = cjson['server'];
      cjson.log_level = 'error';
      sjson.log_level = 'error';

      const cpath = path.join(tmpDir, fname + `-${i}.client.json`);
      const spath = path.join(tmpDir, fname + `-${i}.server.json`);

      await Promise.all([
        writeFile(cpath, JSON.stringify(cjson, null, 2)),
        writeFile(spath, JSON.stringify(sjson, null, 2)),
      ]);

      try {
        const stdout = child_process.execFileSync(
          IPERF_PATH, [cpath, spath, SEC_PER_CASE.toString()], { encoding: 'utf-8' }
        );
        const { streams, ...rest } = JSON.parse(stdout).end;
        if (Object.keys(rest).length > 0) {
          results.push({
            entry: entry,
            index: i,
            description: key,
            server_config: sjson,
            ...rest,
          });
        } else {
          console.log(chalk.bgYellow.red('FAIL') + ' ' + entry);
          console.log(stdout);
        }
      } catch (err) {
        console.error(err);
      }
    }
    const bpath = path.join(process.cwd(), path.dirname(entry), fname + `.bench.json`);
    await writeFile(bpath, JSON.stringify(results, null, 2));
  }
}

main();
