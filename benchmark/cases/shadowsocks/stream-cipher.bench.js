const set = require('lodash.set');
const clonedeep = require('lodash.clonedeep');

const json = {
  "service": "tcp://127.0.0.1:1081?forward=127.0.0.1:1083",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "secret",
    "presets": [
      { "name": "ss-base" },
      { "name": "ss-stream-cipher", "params": { "method": "" } }
    ]
  }
};

function compile(method) {
  return set(clonedeep(json), 'server.presets[1].params.method', method);
}

module.exports = function main() {
  return {
    'none': compile('none'),
    'aes-128-ctr': compile('aes-128-ctr'),
    'aes-192-ctr': compile('aes-192-ctr'),
    'aes-256-ctr': compile('aes-256-ctr'),
    'aes-128-cfb': compile('aes-128-cfb'),
    'aes-192-cfb': compile('aes-192-cfb'),
    'aes-256-cfb': compile('aes-256-cfb'),
    'rc4-md5': compile('rc4-md5'),
    'rc4-md5-6': compile('rc4-md5-6'),
    'chacha20-ietf': compile('chacha20-ietf'),
    'camellia-128-cfb': compile('camellia-128-cfb'),
    'camellia-192-cfb': compile('camellia-192-cfb'),
    'camellia-256-cfb': compile('camellia-256-cfb'),
  };
};
