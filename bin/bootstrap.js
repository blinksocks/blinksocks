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

module.exports = function bootstrap(configPath, {Hub, Config, Balancer}) {
  try {
    Config.init(obtainConfig(configPath));

    if (__IS_WATCH__) {
      fs.watchFile(configPath, function (curr, prev) {
        if (curr.mtime > prev.mtime) {
          console.log(`==> [bootstrap] ${path.basename(configPath)} has changed, reload`);
          try {
            Config.init(obtainConfig(configPath));
            if (__IS_CLIENT__) {
              console.info('==> [balancer] restarted');
              Balancer.start(__SERVERS__);
            }
            console.info(JSON.stringify(__ALL_CONFIG__));
          } catch (err) {
            console.error(err);
          }
        }
      });
    }

    const app = new Hub();
    app.on('close', () => process.exit(0));
    app.run();

    process.on('SIGINT', () => app.terminate());
  } catch (err) {
    console.error(err);
    process.exit(-1);
  }
};
