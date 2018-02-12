import {CONNECT_TO_REMOTE} from '../../src/presets';
import {PresetRunner} from '../common';

test('running on client', async () => {
  const runner = new PresetRunner({
    name: 'v2ray-vmess',
    params: {
      id: 'a3482e88-686a-4a58-8126-99c9df64b7bf',
      security: 'aes-128-gcm'
    }
  }, {
    IS_CLIENT: true,
    IS_SERVER: false
  });

  runner.notify({
    type: CONNECT_TO_REMOTE,
    payload: {
      host: 'example.com',
      port: 443
    }
  });

  const packet_1 = await runner.forward('12');
  const packet_2 = await runner.forward('34');

  expect(packet_1.length).toBeGreaterThanOrEqual(50);
  expect(packet_2.length).toBeGreaterThanOrEqual(20);

  // fail on wrong data
  await expect(runner.backward(Buffer.alloc(35))).rejects.toBeDefined();

  runner.destroy();
});

test('running on server', async () => {
  const runner = new PresetRunner({
    name: 'v2ray-vmess',
    params: {
      id: 'a3482e88-686a-4a58-8126-99c9df64b7bf'
    }
  }, {
    IS_CLIENT: false,
    IS_SERVER: true
  });

  // fail on wrong data
  await expect(runner.backward(Buffer.alloc(35))).rejects.toBeDefined();

  runner.destroy();
});
