const set = require('lodash.set');
const clonedeep = require('lodash.clonedeep');

const json = {
  "service": "tcp://127.0.0.1:1081?forward=127.0.0.1:1083",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "secret",
    "presets": [
      {
        "name": "v2ray-vmess",
        "params": {
          "id": "a3482e88-686a-4a58-8126-99c9df64b7bf",
          "security": "chacha20-poly1305"
        }
      }
    ]
  }
};

function compile(method) {
  return set(clonedeep(json), 'server.presets[0].params.security', method);
}

module.exports = function main() {
  return {
    'none': compile('none'),
    'aes-128-gcm': compile('aes-128-gcm'),
    'chacha20-poly1305': compile('chacha20-poly1305'),
  };
};
