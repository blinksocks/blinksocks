import path from 'path';
import run from '../common/run-e2e';

const tlsKey = path.resolve(__dirname, 'resources', 'key.pem');
const tlsCert = path.resolve(__dirname, 'resources', 'cert.pem');

const clientJson = {
  'service': 'socks5://127.0.0.1:1081',
  'server': {
    'service': 'wss://localhost:1082',
    'key': '9{*2gdBSdCrgnSBD',
    'presets': [
      { 'name': 'ss-base' },
      { 'name': 'obfs-random-padding' },
      { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-128-ctr' } },
    ],
    'tls_cert': tlsCert,
    'tls_cert_self_signed': true,
  },
};

const serverJson = {
  'service': 'wss://localhost:1082',
  'key': '9{*2gdBSdCrgnSBD',
  'presets': [
    { 'name': 'ss-base' },
    { 'name': 'obfs-random-padding' },
    { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-128-ctr' } },
  ],
  'tls_cert': tlsCert,
  'tls_key': tlsKey,
};

test('transport-layer-wss', async () => await run({ clientJson, serverJson }));
