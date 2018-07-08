const set = require('lodash.set');
const clonedeep = require('lodash.clonedeep');

const json = {
  "service": "tcp://127.0.0.1:1081?forward=127.0.0.1:1083",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "secret",
    "presets": [
      { "name": "ss-base" },
      { "name": "aead-random-cipher", "params": { "method": "" } },
    ]
  }
};

function compile(method) {
  return set(clonedeep(json), 'server.presets[1].params.method', method);
}

module.exports = function main() {
  return {
    'aes-128-gcm': compile('aes-128-gcm'),
    'aes-192-gcm': compile('aes-192-gcm'),
    'aes-256-gcm': compile('aes-256-gcm'),
  };
};
