import path from 'path';
import { curl, MOCK_RESPONSE } from '../common/run-e2e';
import { Hub } from '../../src';

const clientJson = {
  'service': 'socks5://127.0.0.1:1081',
  'server': {
    'service': 'tcp://127.0.0.1:1082',
    'key': '9{*2gdBSdCrgnSBD',
    'presets': [
      { 'name': 'ss-base' },
      { 'name': 'obfs-random-padding' },
      { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-128-ctr' } }
    ],
  },
  'log_level': 'debug'
};

const serverJson = {
  'service': 'tcp://127.0.0.1:1082',
  'key': '9{*2gdBSdCrgnSBD',
  'presets': [
    { 'name': 'ss-base' },
    { 'name': 'obfs-random-padding' },
    { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-128-ctr' } }
  ],
  'acl': true,
  'acl_conf': path.resolve(__dirname, 'resources', 'acl.txt'),
  'log_level': 'debug'
};

test('multiplexing', async () => {
  const client = new Hub(clientJson);
  const server = new Hub(serverJson);
  await client.run();
  await server.run();
  expect(await curl({})).not.toBe(MOCK_RESPONSE);
  await client.terminate();
  await server.terminate();
});
