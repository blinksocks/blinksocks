if (process.env.NODE_ENV === 'development') {
  require('babel-register');
  module.exports = require('../src');
} else {
  module.exports = require('../lib');
}
