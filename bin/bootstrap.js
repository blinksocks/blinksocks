const fs = require('fs');
const path = require('path');
const program = require('commander');
const packageJson = require('../package.json');

// const BOOTSTRAP_TYPE_CLIENT = 0;
const BOOTSTRAP_TYPE_SERVER = 1;

const version = packageJson.version;
const usage = '--config <file> [...]';

const options = [
  ['-c, --config <file>', 'a json/js format configuration file', '']
];

const examples = `
  Examples:

    $ blinksocks client -c config.js
    $ blinksocks server -c config.js
`;

/**
 * get raw config object from js or json
 * @param type, BOOTSTRAP_TYPE_CLIENT or BOOTSTRAP_TYPE_SERVER
 * @param options
 * @returns {object}
 */
function obtainConfig(type, options) {
  if (options.config === '') {
    throw Error('-c/--config is required');
  }

  let json;

  // resolve to absolute path
  const file = path.resolve(process.cwd(), options.config);
  try {
    const ext = path.extname(file);
    if (ext === '.js') {
      // require .js directly
      delete require.cache[require.resolve(file)];
      json = require(file);
    } else {
      // others are treated as .json
      const jsonFile = fs.readFileSync(file);
      json = JSON.parse(jsonFile);
    }
    // Object.assign(config, json);
  } catch (err) {
    throw Error(`fail to parse your \'${options.config}\'`);
  }

  /// post-process
  if (type === BOOTSTRAP_TYPE_SERVER) {
    delete json.servers;
  }
  return json;
}

module.exports = function (type, {Hub, Config, Balancer}) {
  const pg = program.version(version).usage(usage);

  for (const option of options) {
    pg.option(...option);
  }

  program.on('--help', () => console.log(examples));
  program.parse(process.argv);

  // no options provided
  if (process.argv.length < 3) {
    program.help();
    process.exit(0);
  }

  try {
    Config.init(obtainConfig(type, program));

    if (__IS_WATCH__) {
      fs.watchFile(program.config, function (curr, prev) {
        if (curr.mtime > prev.mtime) {
          console.log(`==> [bootstrap] ${program.config} has changed, reload`);
          try {
            Config.init(obtainConfig(type, program));
            if (__IS_CLIENT__) {
              console.info('==> [balancer] restarted');
              Balancer.start(__SERVERS__);
            }
            console.info(JSON.stringify(__ALL_CONFIG__, null, '  '));
          } catch (err) {
            console.error(err);
          }
        }
      });
    }

    const app = new Hub();
    app.run();
    process.on('SIGINT', () => app.onClose());
  } catch (err) {
    console.error(err);
    process.exit(-1);
  }
};
