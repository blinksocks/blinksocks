const set = require('lodash.set');
const clonedeep = require('lodash.clonedeep');

const json = {
  "service": "tcp://127.0.0.1:1081?forward=127.0.0.1:1083",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "secret",
    "presets": []
  }
};

function compile(presets) {
  return set(clonedeep(json), 'server.presets', [{ "name": "ss-base" }].concat(presets));
}

module.exports = function main() {
  return {
    'aes-128-gcm + obfs-random-padding': compile([
      { "name": "obfs-random-padding" },
      { "name": "ss-aead-cipher", "params": { "method": "aes-128-gcm" } },
    ]),
    'aes-128-gcm + obfs-tls1.2-ticket': compile([
      { "name": "ss-aead-cipher", "params": { "method": "aes-128-gcm" } },
      { "name": "obfs-tls1.2-ticket", "params": { "sni": ["example.com"] } }
    ]),
  };
};
