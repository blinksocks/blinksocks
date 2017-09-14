import {getPresetClassByName} from '../../src/presets';
import {PresetRunner} from '../common';

test('running on both client and server', async () => {
  const runner = new PresetRunner({
    clazz: getPresetClassByName('ss-stream-cipher'),
    params: {
      method: 'aes-128-ctr'
    }
  }, {
    __KEY__: 'secret',
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });

  // should add 16 more bytes at the beginning
  expect(await runner.forward('1')).toHaveLength(16 + 1);
  // just payload
  expect(await runner.forward('23')).toHaveLength(2);

  // should fail because too short to get iv
  await expect(runner.backward('000000000000000')).rejects.toBeDefined();
  const iv = Buffer.alloc(16);
  // payload is empty
  expect(await runner.backward(iv)).toHaveLength(0);
  // just payload
  expect(await runner.backward('45')).toMatchSnapshot();

  runner.destroy();
});
