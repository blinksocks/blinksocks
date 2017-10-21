if (process.env.NODE_ENV === 'development') {
  require('babel-register');
  // https://github.com/zeit/pkg/issues/261
  module.exports = require('../src', 'must-exclude');
} else {
  module.exports = require('../lib');
}
