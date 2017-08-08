import fs from 'fs';
import path from 'path';
import * as __modules__ from './core';

// only for webpack bundle
if (global.__WEBPACK__) {
  const argv = process.argv;
  const usage = 'Usage: node blinksocks.js -c/--config <json_file>';

  const conditions = [
    argv.length !== 4,
    (argv[2] !== '-c' && argv[2] !== '--config'),
    !argv[3].endsWith('.json')
  ];

  if (conditions.some((c) => c)) {
    console.log(usage);
    process.exit(0);
  }

  const file = path.resolve(process.cwd(), argv[3]);

  let json = null;
  try {
    const jsonFile = fs.readFileSync(file);
    json = JSON.parse(jsonFile);
  } catch (err) {
    throw Error(`fail to parse your '${file}': ${err.message}`);
  }

  const app = new __modules__.Hub(json);
  app.on('close', () => process.exit(0));
  app.run();

  process.on('SIGINT', () => app.terminate());
}

module.exports = __modules__;
