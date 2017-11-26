const cluster = require('cluster');
const fs = require('fs');

/**
 * get raw config object from json
 * @param file
 * @returns {object}
 */
function obtainConfig(file) {
  let json;
  try {
    const jsonFile = fs.readFileSync(file);
    json = JSON.parse(jsonFile);
  } catch (err) {
    throw Error(`fail to load/parse your '${file}': ${err.message}`);
  }
  return json;
}

module.exports = function bootstrap(configPath, {Hub, Config}) {
  try {
    Config.init(obtainConfig(configPath));
    if (cluster.isMaster && __WORKERS__ > 0) {
      for (let i = 0; i < __WORKERS__; ++i) {
        cluster.fork();
      }
      console.log(`[bootstrap] started ${__WORKERS__} workers`);
    } else {
      const hub = new Hub();
      hub.run();
      process.on('SIGINT', () => hub.terminate(() => process.exit(0)));
    }
  } catch (err) {
    console.error(err);
    process.exit(-1);
  }
};
