const fs = require('fs');
const program = require('commander');
const packageJson = require('../package.json');

const options = [
  ['-c, --config [file]', 'a json file for configuration, if specified, ignore other options', ''],
  ['--host <host>', 'an ip address or a hostname to bind'],
  ['--port <port>', 'where to listen on'],
  ['--server-host [server-host]', 'an ip address or a hostname to connect'],
  ['--server-port [server-port]', 'where is the server listen on'],
  ['--key <key>', 'a key for encryption and decryption'],
  ['--frame [frame]', 'a preset used in frame middleware', 'origin'],
  ['--frame-params [crypto-params]', 'parameters for frame preset', ''],
  ['--crypto [crypto]', 'a preset used in crypto middleware', 'none'],
  ['--crypto-params [crypto-params]', 'parameters for crypto preset', ''],
  ['--protocol [protocol]', 'a preset used in protocol middleware', 'none'],
  ['--protocol-params [protocol-params]', 'parameters for protocol preset', ''],
  ['--obfs [obfs]', 'a preset used in obfs middleware', 'none'],
  ['--obfs-params [obfs-params]', 'parameters for obfs preset', ''],
  ['--log-level [log-level]', 'log4js log level', 'all'],
  ['-q, --quiet', 'limit log level to \'error\''],
  ['--ciphers', 'show all supported ciphers'],
  ['--hashes', 'show all supported hash functions']
];

const examples = `
  Examples:
  
  As simple as possible:
    $ blinksocks -c config.json
  
  To start a server:
    $ blinksocks --host 0.0.0.0 --port 7777 --key key --crypto openssl --crypto-params aes-256-cfb
  
  To start a client:
    $ blinksocks --host localhost --port 1080 --server-host example.com --server-port 7777 --key key --crypto openssl --crypto-params aes-256-cfb
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
  const {host, port, serverHost, serverPort, key} = options;
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
  if (serverHost) {
    Object.assign(config, {
      server_host: serverHost,
      server_port: parseInt(serverPort, 10)
    });
  }
  return config;
}

module.exports = function ({Hub, Crypto}) {
  const pg = program
    .version(packageJson.version)
    .usage('--host <host> --port <port> --key <key> [...]');

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

  // --ciphers
  if (program.ciphers) {
    console.log(Crypto.getAvailableCiphers().join('\n'));
    process.exit(0);
  }

  // --hashes
  if (program.hashes) {
    console.log(Crypto.getAvailableHashes().join('\n'));
    process.exit(0);
  }

  const config = obtainConfig(program);
  if (config !== null) {
    try {
      const app = new Hub(config);
      app.run();
      process.on('SIGINT', () => process.exit(0));
    } catch (err) {
      console.error(err.message);
      process.exit(-1);
    }
  } else {
    program.help();
  }
};
