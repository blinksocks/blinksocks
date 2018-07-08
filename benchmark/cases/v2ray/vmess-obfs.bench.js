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
          "security": "aes-128-gcm"
        }
      },
      null
    ]
  }
};

function compile(preset) {
  return set(clonedeep(json), 'server.presets[1]', preset);
}

module.exports = function main() {
  return {
    'aes-128-gcm + obfs-random-padding': compile({
      "name": "obfs-random-padding"
    }),
    'aes-128-gcm + obfs-tls1.2-ticket': compile({
      "name": "obfs-tls1.2-ticket",
      "params": { "sni": ["example.com"] }
    }),
  };
};
