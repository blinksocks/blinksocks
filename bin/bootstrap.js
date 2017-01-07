const fs = require('fs');
const program = require('commander');
const packageJson = require('../package.json');

/**
 * get raw config object from json or command line options
 * @param options
 * @returns {*}
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
  const {host, port, serverHost, serverPort} = options;
  const {password, cipher, logLevel} = options;
  const {useIv, quiet} = options;
  return {
    host,
    port: parseInt(port, 10),
    server_host: serverHost,
    server_port: parseInt(serverPort, 10),
    password,
    cipher,
    'use_iv': typeof useIv === 'undefined' ? false : useIv,
    'log_level': typeof quiet === 'undefined' ? logLevel : 'error'
  };
}

module.exports = function ({Hub, Crypto}) {
  program
    .version(packageJson.version)
    .usage('[options] [...]')
    .option('-c, --config [file]', 'a json file for configuration, if specified, ignore other options', '')
    .option('--host <host>', 'an ip address or a hostname to bind')
    .option('--port <port>', 'where to listen on')
    .option('--password <password>', 'a password for encryption and decryption')
    .option('--server-host [serverHost]', 'an ip address or a hostname to connect')
    .option('--server-port [serverPort]', 'where is the server listen on')
    .option('--cipher [cipher]', 'a method for encryption or decryption, leave it empty to enbaled non-encryption mode', '')
    .option('--use-iv', 'if use initialization vector for encryption')
    .option('--log-level [logLevel]', 'log4js log level', 'all')
    .option('-q, --quiet', 'limit log level to \'error\'')
    .option('--ciphers', 'show all supported ciphers');

  program.on('--help', function () {
    console.log('  Examples:');
    console.log('');
    console.log('  As simple as possible:');
    console.log('    $ blinksocks -c config.json');
    console.log('');
    console.log('  To start a server:');
    console.log('    $ blinksocks --host 0.0.0.0 --port 7777 --password password --cipher \"aes-256-cfb\"');
    console.log('');
    console.log('  To start a client:');
    console.log('    $ blinksocks --host localhost --port 1080 --password password' +
      ' --server-host example.com --server-port 7777 --cipher \"aes-256-cfb\"');
  });

  program.parse(process.argv);

  // no options provided
  if (process.argv.length < 3) {
    program.help();
    process.exit(0);
  }

  // --ciphers
  if (program.ciphers) {
    console.log(Crypto.getCiphers().join('\n'));
    process.exit(0);
  }

  const config = obtainConfig(program);
  if (config !== null) {
    try {
      const app = new Hub(config);
      app.run();

      // let quitCount = 2;
      process.on('SIGINT', () => {
        // if (--quitCount > 0) {
        // console.log('Gracefully shutting down from SIGINT (Ctrl+C)');
        // process.exit(0);
        // } else {
        process.exit(0);
        // }
      });
    } catch (err) {
      console.error(err.message);
      process.exit(-1);
    }
  } else {
    program.help();
  }
};
