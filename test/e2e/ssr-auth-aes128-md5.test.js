import run from '../common/run-e2e';

const clientJson = {
  'service': 'socks5://127.0.0.1:1081',
  'server': {
    'service': 'tcp://127.0.0.1:1082',
    'key': '9{*2gdBSdCrgnSBD',
    'presets': [
      { 'name': 'ss-base' },
      { 'name': 'ssr-auth-aes128-md5' },
      { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-256-cfb' } },
    ],
  },
};

const serverJson = {
  'service': 'tcp://127.0.0.1:1082',
  'key': '9{*2gdBSdCrgnSBD',
  'presets': [
    { 'name': 'ss-base' },
    { 'name': 'ssr-auth-aes128-md5' },
    { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-256-cfb' } },
  ],
};

test('ssr-auth-aes128-md5', async () => {
  await run({ clientJson, serverJson });
  await run({ clientJson, serverJson, isUdp: true });
});
