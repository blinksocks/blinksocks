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
    const hub = new Hub(config);
    hub.run();
  } catch (err) {
    console.error(err);
    process.exit(-1);
  }
};
