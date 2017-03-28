const fs = require('fs');
const program = require('commander');
const packageJson = require('../package.json');

// const BOOTSTRAP_TYPE_CLIENT = 0;
const BOOTSTRAP_TYPE_SERVER = 1;

const version = packageJson.version;
const usage = '--host <host> --port <port> --key <key> [...]';

const options = [
  ['-c, --config [file]', 'a json format file for configuration', ''],
  ['--host <host>', 'an ip address or a hostname to bind, default: \'localhost\'', 'localhost'],
  ['--port <port>', 'where to listen on, default: 1080', 1080],
  ['--servers [servers]', 'a list of servers used by client, split by comma, default: \'\'', (value) => value.split(','), ''],
  ['--key <key>', 'a key for encryption and decryption'],
  ['--frame [frame]', 'a preset used in frame middleware, default: \'origin\'', 'origin'],
  ['--frame-params [crypto-params]', 'parameters for frame preset, default: \'\'', ''],
  ['--crypto [crypto]', 'a preset used in crypto middleware, default: \'\'', ''],
  ['--crypto-params [crypto-params]', 'parameters for crypto, default: \'aes-256-cfb\'', 'aes-256-cfb'],
  ['--protocol [protocol]', 'a preset used in protocol middleware, default: \'ss-aead\'', 'ss-aead'],
  ['--protocol-params [protocol-params]', 'parameters for protocol, default: \'aes-256-gcm,ss-subkey\'', 'aes-256-gcm,ss-subkey'],
  ['--obfs [obfs]', 'a preset used in obfs middleware, default: \'\'', ''],
  ['--obfs-params [obfs-params]', 'parameters for obfs, default: \'\'', ''],
  ['--log-level [log-level]', 'log level, default: \'silly\'', 'silly'],
  ['-q, --quiet', 'force log level to \'error\''],
  ['--profile', 'generate performance statistics, store at blinksocks.profile.log once exit']
];

const examples = `
  Examples:
  
  As simple as possible:
    $ blinksocks client -c config.json
  
  To start a server:
    $ blinksocks server --host 0.0.0.0 --port 7777 --key password
  
  To start a client:
    $ blinksocks client --host localhost --port 1080 --key password --servers=node1.test.com:7777,node2.test.com:7777
`;

/**
 * get raw config object from json or command line options
 * @param type
 * @param options
 * @returns {object}
 */
function obtainConfig(type, options) {
  let config = {};
  if (options.config !== '') {
    // via --config
    const file = options.config;
    try {
      const jsonFile = fs.readFileSync(file);
      config = JSON.parse(jsonFile);
    } catch (err) {
      console.error(`error parse your \'${file}\'`);
      process.exit(-1);
    }
  } else {
    // via CLI
    const {host, port, key, logLevel} = options;
    const {frame, frameParams, crypto, cryptoParams, protocol, protocolParams, obfs, obfsParams} = options;
    Object.assign(config, {
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
      log_level: quiet ? 'error' : logLevel
    });
  }
  // others
  const {servers, quiet, profile} = options;
  Object.assign(config, {
    profile: !!profile,
    servers: (servers || config.servers || []).filter((server) => server[0] !== '-')
  });
  if (type === BOOTSTRAP_TYPE_SERVER) {
    delete config.servers;
  }
  return config;
}

module.exports = function (type, {Hub}) {
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

  const config = obtainConfig(type, program);
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
