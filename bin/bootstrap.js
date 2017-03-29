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
  ['--servers [servers]', 'a list of servers used by client, split by comma, default: \'\'', (value) => value.split(','), []],
  ['--key <key>', 'a key for encryption and decryption'],
  ['--frame [frame]', 'a preset used in frame middleware, default: \'origin\'', 'origin'],
  ['--frame-params [crypto-params]', 'parameters for frame preset, default: \'\'', ''],
  ['--crypto [crypto]', 'a preset used in crypto middleware, default: \'\'', ''],
  ['--crypto-params [crypto-params]', 'parameters for crypto, default: \'aes-256-cfb\'', 'aes-256-cfb'],
  ['--protocol [protocol]', 'a preset used in protocol middleware, default: \'ss-aead\'', 'ss-aead'],
  ['--protocol-params [protocol-params]', 'parameters for protocol, default: \'aes-256-gcm,ss-subkey\'', 'aes-256-gcm,ss-subkey'],
  ['--obfs [obfs]', 'a preset used in obfs middleware, default: \'\'', ''],
  ['--obfs-params [obfs-params]', 'parameters for obfs, default: \'\'', ''],
  ['--redirect [redirect]', 'redirect stream to here when any preset fail to process, default: \'\'', ''],
  ['--log-level [log-level]', 'log level, default: \'silly\'', 'silly'],
  ['-q, --quiet [quiet]', 'force log level to \'error\', default: false', false],
  ['-w, --watch [watch]', 'hot reload config.json specified via -c, default: true', true],
  ['--profile [profile]', 'generate performance statistics, store at blinksocks.profile.log once exit, default: false', false]
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
 * @param type, BOOTSTRAP_TYPE_CLIENT or BOOTSTRAP_TYPE_SERVER
 * @param options
 * @returns {object}
 */
function obtainConfig(type, options) {
  // CLI options should be able to overwrite options specified in --config
  const {host, servers, key, quiet} = options;
  const {frame, crypto, protocol, obfs, redirect} = options;

  // renames
  const [frame_params, crypto_params, protocol_params, obfs_params] = [
    options.frameParams,
    options.cryptoParams,
    options.protocolParams,
    options.obfsParams
  ];

  // pre-process
  const [port, log_level, watch, profile] = [
    parseInt(options.port, 10),
    quiet ? 'error' : options.logLevel,
    !!options.watch,
    !!options.profile
  ];

  // assemble, undefined fields will be omitted
  const config = {
    host,
    port,
    servers,
    key,
    frame,
    frame_params,
    crypto,
    crypto_params,
    protocol,
    protocol_params,
    obfs,
    obfs_params,
    redirect,
    log_level,
    watch,
    profile
  };

  // --config, if provided, options in config.json should be able to overwrite CLI options
  if (options.config !== '') {
    const file = options.config;
    try {
      const jsonFile = fs.readFileSync(file);
      Object.assign(config, JSON.parse(jsonFile));
    } catch (err) {
      throw Error(`error parse your \'${file}\'`);
    }
  }

  /// post-process
  if (type === BOOTSTRAP_TYPE_SERVER) {
    delete config.servers;
  } else {
    config.servers = config.servers.filter((server) => server[0] !== '-');
  }
  return config;
}

module.exports = function (type, {Hub, Config}) {
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

  if (program.config !== '' && program.watch) {
    fs.watchFile(program.config, function (curr, prev) {
      if (curr.mtime > prev.mtime) {
        console.log(`==> [bootstrap] ${program.config} has changed, reload`);
        try {
          Config.init(obtainConfig(type, program));
          console.info(JSON.stringify(Config.abstract(), null, '  '));
        } catch (err) {
          console.error(err.message);
        }
      }
    });
  }

  try {
    Config.init(obtainConfig(type, program));
    const app = new Hub();
    app.run();
    process.on('SIGINT', () => app.onClose());
  } catch (err) {
    console.error(err.message);
    process.exit(-1);
  }
};
