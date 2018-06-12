import path from 'path';
import clone from 'lodash.clonedeep';
import run from '../common/run-e2e';

const tlsKey = path.resolve(__dirname, 'resources', 'key.pem');
const tlsCert = path.resolve(__dirname, 'resources', 'cert.pem');

const client = {
  'service': 'socks5://127.0.0.1:1081',
  'server': {
    'service': 'tls://localhost:1082',
    'key': '9{*2gdBSdCrgnSBD',
    'presets': [
      { 'name': 'ss-base' },
      { 'name': 'obfs-random-padding' },
      { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-128-ctr' } },
    ],
    'tls_cert': tlsCert,
    'tls_cert_self_signed': false,
  },
};

const server = {
  'service': 'tls://localhost:1082',
  'key': '9{*2gdBSdCrgnSBD',
  'presets': [
    { 'name': 'ss-base' },
    { 'name': 'obfs-random-padding' },
    { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-128-ctr' } },
  ],
  'tls_cert': tlsCert,
  'tls_key': tlsKey,
};

test('transport-layer-tls, tls_cert_self_signed is false', async () => {
  await run({ clientJson: client, serverJson: server, not: true });
});

test('transport-layer-tls, tls_cert_self_signed is true', async () => {
  const clientJson = clone(client);
  clientJson.server['tls_cert_self_signed'] = true;
  await run({ clientJson, serverJson: server });
});
