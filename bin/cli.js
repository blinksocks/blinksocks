#!/usr/bin/env node
const program = require('commander');
const packageJson = require('../package.json');

const usage = '[command] [options]';

program
  .version(packageJson.version)
  .usage(usage)
  .command('init', 'generate configuration pair randomly')
  .command('run [options]', 'start service')
  .parse(process.argv);

// no options provided

if (process.argv.length < 2) {
  program.help();
  process.exit(0);
}
