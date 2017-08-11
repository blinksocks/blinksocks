#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const init = require('./init');
const bootstrap = require('./bootstrap');
const modules = require('./modules');
const {version} = require('../package.json');

const examples = [
  ['Generate json file', '$ blinksocks init'],
  ['Start blinksocks client', '$ blinksocks --config blinksocks.client.json'],
  ['Start blinksocks server', '$ blinksocks --config blinksocks.server.json']
];

const usage = `
  Usage: blinksocks [command] [options] ...

  Commands:

    init           generate a pair of json file

  Options:

    -h, --help     output usage information
    -v, --version  output blinksocks version
    -c, --config   file with configuration, usually a json file

  Examples:

${examples.map(([description, example]) => `  ${chalk.gray('-')} ${description}\n    ${chalk.blue(example)}`).join('\n')}
`;

const argv = process.argv;

if (argv.length < 3) {
  return console.log(usage);
}

const options = argv.slice(2);

function hasOption(opt) {
  return options.indexOf(opt) !== -1;
}

function getOptionValue(opt) {
  const index = options.indexOf(opt);
  if (index !== -1) {
    return options[index + 1];
  }
  return undefined;
}

if (hasOption('-h') || hasOption('--help')) {
  return console.log(usage);
}

if (hasOption('-v') || hasOption('--version')) {
  return console.log(version);
}

if (hasOption('-c') || hasOption('--config')) {
  let configPath = getOptionValue('-c') || getOptionValue('--config');

  if (configPath === undefined) {
    return console.log(chalk.red('config file must be provided'));
  }

  configPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(configPath)) {
    return console.log(chalk.red('config file is not found'));
  }

  return bootstrap(configPath, modules);
}

if (options[0] === 'init') {
  return init();
}

// other cases
console.log(usage);
