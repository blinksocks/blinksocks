const set = require('lodash.set');
const clonedeep = require('lodash.clonedeep');

const json = {
  "service": "tcp://127.0.0.1:1081?forward=127.0.0.1:1083",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "secret",
    "presets": [
      { "name": "base-auth", "params": { "method": "" } },
    ]
  }
};

function compile(method) {
  return set(clonedeep(json), 'server.presets[0].params.method', method);
}

module.exports = function main() {
  return {
    'md5': compile('md5'),
    'sha1': compile('sha1'),
    'sha256': compile('sha256'),
  };
};
