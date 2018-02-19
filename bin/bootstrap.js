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

/**
 * print error then exit with exit code -1
 * @param err
 */
function onError(err) {
  console.error(err);
  process.exit(-1);
}

module.exports = function bootstrap(configPath, { Hub, Config }) {
  try {
    const config = obtainConfig(configPath);
    Config.test(config);
    const hub = new Hub(config);
    hub.run().catch(onError);
  } catch (err) {
    onError(err);
  }
};
