import path from 'path';
import run from '../common/run-e2e';

const tlsKey = path.resolve(__dirname, 'resources', 'key.pem');
const tlsCert = path.resolve(__dirname, 'resources', 'cert.pem');

const clientJson = {
  'service': 'socks5://127.0.0.1:1081',
  'server': {
    'service': 'h2://localhost:1082',
    'key': '9{*2gdBSdCrgnSBD',
    'presets': [
      { 'name': 'ss-base' },
    ],
    'tls_cert': tlsCert,
    'tls_cert_self_signed': true,
  },
};

const serverJson = {
  'service': 'h2://localhost:1082',
  'key': '9{*2gdBSdCrgnSBD',
  'presets': [
    { 'name': 'ss-base' },
  ],
  'tls_cert': tlsCert,
  'tls_key': tlsKey,
};

test('transport-layer-http2', async () => await run({ clientJson, serverJson }));
