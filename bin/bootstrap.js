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
    const config = obtainConfig(configPath);
    Config.test(config);
    const workers = config.workers;
    if (cluster.isMaster && workers > 0) {
      for (let i = 0; i < workers; ++i) {
        cluster.fork();
      }
      console.log(`[bootstrap] started ${workers} workers`);
    } else {
      const hub = new Hub(config);
      hub.run();
      process.on('SIGINT', () => hub.terminate(() => process.exit(0)));
    }
  } catch (err) {
    console.error(err);
    process.exit(-1);
  }
};
