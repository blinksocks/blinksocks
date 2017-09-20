import {CONNECTION_CLOSED} from '../../src/presets';
import {PresetRunner} from '../common';

test('running on both client and server', async () => {
  const runner = new PresetRunner({
    name: 'exp-compress',
    params: {
      method: 'deflate',
      threshold: '50b'
    }
  }, {
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });

  const compressed = await runner.forward(Buffer.alloc(50 + 10));

  // just payload
  expect(compressed).toMatchSnapshot();

  // just payload
  expect(await runner.backward(compressed)).toMatchSnapshot();

  runner.notify({type: CONNECTION_CLOSED});
});
