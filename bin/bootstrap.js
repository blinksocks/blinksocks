const cluster = require('cluster');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * get raw config object from js or json
 * @param file
 * @returns {object}
 */
function obtainConfig(file) {
  let json;
  try {
    const ext = path.extname(file);
    // TODO: remove .js support in v2.6.x for security reason
    if (ext === '.js') {
      // require .js directly
      delete require.cache[require.resolve(file)];
      json = require(file);
      console.warn(chalk.yellow.underline('\n>> WARN: using .js configuration will be deprecated in v2.6.x, please use .json instead. <<\n'));
    } else {
      // others are treated as .json
      const jsonFile = fs.readFileSync(file);
      json = JSON.parse(jsonFile);
    }
  } catch (err) {
    throw Error(`fail to load/parse your '${file}': ${err.message}`);
  }
  return json;
}

module.exports = function bootstrap(configPath, {Hub, Config}) {
  try {
    Config.init(obtainConfig(configPath));
    if (cluster.isMaster) {
      for (let i = 0; i < __WORKERS__; ++i) {
        cluster.fork();
      }
      console.log(`==> [bootstrap] started ${__WORKERS__} workers`);
    } else {
      const hub = new Hub();
      hub.on('close', () => process.exit(0));
      hub.run();
      process.on('SIGINT', () => hub.terminate());
    }
  } catch (err) {
    console.error(err);
    process.exit(-1);
  }
};
