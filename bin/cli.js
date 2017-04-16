#!/usr/bin/env node
const program = require('commander');
const packageJson = require('../package.json');

program
  .version(packageJson.version)
  .usage('[command] [options]')
  .command('init', 'generate configurations with random key')
  .command('client [options]', 'start a client')
  .command('server [options]', 'start a server')
  .parse(process.argv);

if (process.argv.length < 2) {
  program.help();
  process.exit(0);
}
