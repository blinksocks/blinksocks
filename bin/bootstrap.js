const fs = require('fs');
const program = require('commander');
const packageJson = require('../package.json');

const usage = '--host <host> --port <port> --key <key> [...]';

const options = [
  ['-c, --config [file]', 'a json format file for configuration, if specified, other options are ignored', ''],
  ['--host <host>', 'an ip address or a hostname to bind', 'localhost'],
  ['--port <port>', 'where to listen on', 1080],
  ['--servers [servers]', 'a list of servers, split by comma', (value) => value.split(',')],
  ['--key <key>', 'a key for encryption and decryption'],
  ['--frame [frame]', 'a preset used in frame middleware, default: \'origin\'', 'origin'],
  ['--frame-params [crypto-params]', 'parameters for frame preset, default: \'\'', ''],
  ['--crypto [crypto]', 'a preset used in crypto middleware, default: \'openssl\'', 'openssl'],
  ['--crypto-params [crypto-params]', 'parameters for crypto, default: \'aes-256-cfb\'', 'aes-256-cfb'],
  ['--protocol [protocol]', 'a preset used in protocol middleware, default: \'aead\'', 'aead'],
  ['--protocol-params [protocol-params]', 'parameters for protocol, default: \'aes-256-cbc,sha256\'', 'aes-256-cbc,sha256'],
  ['--obfs [obfs]', 'a preset used in obfs middleware, default: \'\'', ''],
  ['--obfs-params [obfs-params]', 'parameters for obfs, default: \'\'', ''],
  ['--log-level [log-level]', 'log level, default: \'silly\'', 'silly'],
  ['-q, --quiet', 'force log level to \'error\'']
];

const examples = `
  Examples:
  
  As simple as possible:
    $ blinksocks run -c config.json
  
  To start a server:
    $ blinksocks run --host 0.0.0.0 --port 7777 --key password
  
  To start a client:
    $ blinksocks run --host localhost --port 1080 --server-host example.com --server-port 7777 --key password
`;

/**
 * get raw config object from json or command line options
 * @param options
 * @returns {object}
 */
function obtainConfig(options) {
  if (options.config !== '') {
    const file = options.config;
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
  const {host, port, servers, key} = options;
  const {frame, frameParams, crypto, cryptoParams, protocol, protocolParams, obfs, obfsParams} = options;
  const {logLevel, quiet} = options;
  const config = {
    host,
    port: parseInt(port, 10),
    key,
    frame,
    frame_params: frameParams,
    crypto,
    crypto_params: cryptoParams,
    protocol,
    protocol_params: protocolParams,
    obfs,
    obfs_params: obfsParams,
    log_level: typeof quiet === 'undefined' ? logLevel : 'error'
  };
  if (servers) {
    Object.assign(config, {servers});
  }
  return config;
}

module.exports = function ({Hub}) {
  const pg = program
    .version(packageJson.version)
    .usage(usage);

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

  const config = obtainConfig(program);
  if (config !== null) {
    try {
      const app = new Hub(config);
      app.run();
      process.on('SIGINT', () => app.onClose());
    } catch (err) {
      console.error(err.message);
      process.exit(-1);
    }
  } else {
    program.help();
  }
};
