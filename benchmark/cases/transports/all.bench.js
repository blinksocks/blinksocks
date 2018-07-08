const path = require('path');
const clonedeep = require('lodash.clonedeep');

const json = {
  "service": "tcp://127.0.0.1:1081?forward=127.0.0.1:1083",
  "server": {
    "service": "",
    "key": "secret",
    "presets": [
      { "name": "ss-base" },
    ],
    "tls_cert": path.join(__dirname, "cert.pem"),
    "tls_key": path.join(__dirname, "key.pem"),
    "tls_cert_self_signed": true,
    "mux": false
  }
};

function compile(transport, mux = false) {
  const _json = clonedeep(json);
  _json.server.service = transport + '://localhost:1082';
  _json.server.mux = mux;
  return _json;
}

module.exports = function main() {
  return {
    'tcp': compile('tcp'),
    // 'tcp + mux': compile('tcp', true),
    'tls': compile('tls'),
    // 'tls + mux': compile('tls', true),
    'ws': compile('ws'),
    // 'ws + mux': compile('ws', true),
    'wss': compile('wss'),
    // 'wss + mux': compile('wss', true),
    'h2': compile('h2'),
    // 'h2 + mux': compile('h2', true),
  };
};
