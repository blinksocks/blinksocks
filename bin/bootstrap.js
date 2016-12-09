#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const options = require('commander');

/**
 * load config.json as object
 * @param file
 * @returns {*}
 */
function loadConfig(file) {
  let config = null;
  try {
    const jsonFile = fs.readFileSync(file);
    config = JSON.parse(jsonFile);
  } catch (err) {
    console.error(`error parse your \'${file}\'`);
    process.exit(-1);
  }
  return config;
}

module.exports = function (Hub) {
  options
    .version('1.0.0')
    .usage('[options] [...]')
    .option('-c, --config <file>', 'a json file for configuration')
    .option('--ciphers', 'show all supported ciphers on the current platform')
    .parse(process.argv);

  // --ciphers
  if (options.ciphers) {
    console.log(crypto.getCiphers());
    process.exit(0);
  }

  const config = loadConfig(options.config);
  const app = new Hub(config);
  app.run();

  let quitCount = 2;
  process.on('SIGINT', () => {
    if (--quitCount > 0) {
      console.log('Gracefully shutting down from SIGINT (Ctrl+C)');
      app.stop().then(() => process.exit());
    } else {
      process.exit(0);
    }
  });
};
