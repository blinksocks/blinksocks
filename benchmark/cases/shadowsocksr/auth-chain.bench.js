const set = require('lodash.set');
const clonedeep = require('lodash.clonedeep');

const json = {
  "service": "tcp://127.0.0.1:1081?forward=127.0.0.1:1083",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "secret",
    "presets": [
      { "name": "ss-base" },
      { "name": "" },
      { "name": "ss-stream-cipher", "params": { "method": "none" } }
    ]
  }
};

function compile(method) {
  return set(clonedeep(json), 'server.presets[1].name', method);
}

module.exports = function main() {
  return {
    'ssr-auth-chain-a': compile('ssr-auth-chain-a'),
    'ssr-auth-chain-b': compile('ssr-auth-chain-b'),
  };
};
