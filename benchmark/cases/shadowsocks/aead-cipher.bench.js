const semver = require('semver');
const set = require('lodash.set');
const clonedeep = require('lodash.clonedeep');

const json = {
  "service": "tcp://127.0.0.1:1081?forward=127.0.0.1:1083",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "secret",
    "presets": [
      { "name": "ss-base" },
      { "name": "ss-aead-cipher", "params": { "method": "" } }
    ]
  }
};

function compile(method) {
  return set(clonedeep(json), 'server.presets[1].params.method', method);
}

module.exports = function main() {
  const cases = {
    'aes-128-gcm': compile('aes-128-gcm'),
    'aes-192-gcm': compile('aes-192-gcm'),
    'aes-256-gcm': compile('aes-256-gcm'),
    'chacha20-poly1305': compile('chacha20-poly1305'),
    'chacha20-ietf-poly1305': compile('chacha20-ietf-poly1305'),
    'xchacha20-ietf-poly1305': compile('xchacha20-ietf-poly1305'),
  };
  if (semver.gte(process.versions.node, '10.2.0')) {
    Object.assign(cases, {
      'aes-128-ccm': compile('aes-128-ccm'),
      'aes-192-ccm': compile('aes-192-ccm'),
      'aes-256-ccm': compile('aes-256-ccm'),
    });
  }
  return cases;
};
