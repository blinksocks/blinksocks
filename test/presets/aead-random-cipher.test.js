import {getPresetClassByName} from '../../src/presets';
import {PresetRunner} from '../common';

test('running on client and server', async () => {
  const runner = new PresetRunner({
    clazz: getPresetClassByName('aead-random-cipher'),
    params: {
      method: 'aes-128-gcm',
      info: 'bs-subkey',
      factor: 2
    }
  }, {
    __KEY__: 'secret',
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });

  const packet_1 = await runner.forward('12');
  const packet_2 = await runner.forward('34');

  // salt(16) and a chunk
  expect(packet_1.length).toBeGreaterThanOrEqual(16 + 2 + 16 + 2 + 16);
  // just chunk
  expect(packet_2.length).toBeGreaterThanOrEqual(2 + 16 + 3 + 16);


  // should decrypt correctly
  expect(await runner.backward(Buffer.from(packet_1))).toHaveLength(2);
  // just data
  expect(await runner.backward(Buffer.from(packet_2))).toHaveLength(2);
  // fail on wrong data
  await expect(runner.backward(Buffer.alloc(400))).rejects.toBeDefined();

  runner.destroy();
});
