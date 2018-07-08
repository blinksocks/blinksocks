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
    'auth-aes128-md5 + obfs-random-padding': compile([
      { "name": "obfs-random-padding" },
      { "name": "ssr-auth-aes128-md5" },
      { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } }
    ]),
    'auth-aes128-md5 + obfs-tls1.2-ticket': compile([
      { "name": "ssr-auth-aes128-md5" },
      { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } },
      { "name": "obfs-tls1.2-ticket", "params": { "sni": ["example.com"] } }
    ]),
  };
};
