import clone from 'lodash.clonedeep';
import run from '../common/run-e2e';

const client = {
  'service': 'socks5://127.0.0.1:1081',
  'server': {
    'service': 'ws://127.0.0.1:1082',
    'key': '9{*2gdBSdCrgnSBD',
    'presets': [
      { 'name': 'ss-base' },
      { 'name': 'obfs-random-padding' },
      { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-128-ctr' } },
    ],
  },
};

const server = {
  'service': 'ws://127.0.0.1:1082',
  'key': '9{*2gdBSdCrgnSBD',
  'presets': [
    { 'name': 'ss-base' },
    { 'name': 'obfs-random-padding' },
    { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-128-ctr' } },
  ],
};

test('transport-layer-ws path=/', async () => {
  await run({ clientJson: client, serverJson: server });
});

test('transport-layer-ws path=/test-path', async () => {
  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.service = 'ws://127.0.0.1:1082/test-path';
  serverJson.service = 'ws://127.0.0.1:1082/test-path';

  await run({ clientJson, serverJson });
});
