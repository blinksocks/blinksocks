import path from 'path';
import log4js from 'log4js';

module.exports = function (jsFileName) {
  return log4js.getLogger(path.basename(jsFileName, '.js'));
};
