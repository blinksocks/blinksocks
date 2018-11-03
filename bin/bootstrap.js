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

module.exports = async function bootstrap(configPath, { Hub, Config, Manager }) {
  try {
    const json = obtainConfig(configPath);
    Config.test(json);

    const config = new Config(json);
    const hub = new Hub(config);

    await hub.run();

    // if (config.manager_host && config.manager_port) {
    //   const manager = new Manager({ config, hub });
    //   await manager.run();
    // }
  } catch (err) {
    onError(err);
  }
};
