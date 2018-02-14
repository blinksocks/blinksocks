import {PresetRunner} from '../common';

test('running on client and server', async () => {
  const runner = new PresetRunner({
    name: 'aead-random-cipher',
    params: {
      method: 'aes-128-gcm'
    }
  }, {
    key: 'secret',
    is_client: true,
    is_server: false
  });

  const packet_1 = await runner.forward('12');
  const packet_2 = await runner.forward('34');

  // salt(16) and a chunk
  expect(packet_1.length).toBeGreaterThanOrEqual(16 + 2 + 16 + 2 + 16);
  // just chunk
  expect(packet_2.length).toBeGreaterThanOrEqual(2 + 16 + 2 + 16);


  // should decrypt correctly
  expect(await runner.backward(Buffer.from(packet_1))).toHaveLength(2);
  // just data
  expect(await runner.backward(Buffer.from(packet_2))).toHaveLength(2);

  runner.destroy();
});
