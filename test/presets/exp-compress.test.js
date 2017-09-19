import {CONNECTION_CLOSED} from '../../src/presets';
import {PresetRunner} from '../common';

test('running on both client and server', async () => {
  const runner = new PresetRunner({
    name: 'exp-compress',
    params: {
      method: 'deflate'
    }
  }, {
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });

  const compressed = await runner.forward('1111111111');

  // just payload
  expect(compressed).toMatchSnapshot();

  // just payload
  expect(await runner.backward(compressed)).toMatchSnapshot();

  runner.notify({type: CONNECTION_CLOSED});
});
