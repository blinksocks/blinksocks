if (process.env.NODE_ENV === 'development') {
  // https://github.com/zeit/pkg/issues/261
  require('@babel/register', 'must-exclude');
  module.exports = require('../src', 'must-exclude');
} else {
  module.exports = require('../lib');
}
