import {getPresetClassByName, CONNECT_TO_REMOTE} from '../../src/presets';
import {PresetRunner} from '../common';

test('running on client and then server', async () => {
  let runner = new PresetRunner({
    clazz: getPresetClassByName('exp-base-auth-stream'),
    params: {
      method: 'aes-256-ctr'
    }
  }, {
    __KEY__: 'secret',
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });

  // client
  runner.notify({
    type: CONNECT_TO_REMOTE,
    payload: {
      host: 'example.com',
      port: 443
    }
  });

  const request_1 = await runner.forward('12');
  const request_2 = await runner.forward('34');

  expect(request_1).toHaveLength(16 + 16 + 1 + 11 + 2 + 2);
  expect(request_2).toHaveLength(2);
  expect(await runner.backward('56')).toHaveLength(2);

  runner.destroy();

  // server
  runner = new PresetRunner({
    clazz: getPresetClassByName('exp-base-auth-stream'),
    params: {
      method: 'aes-256-ctr'
    }
  }, {
    __KEY__: 'secret',
    __IS_CLIENT__: false,
    __IS_SERVER__: true
  });

  runner.preset.broadcast = jest.fn((action) => {
    expect(action).toMatchSnapshot();
    action.payload.onConnected();
  });

  expect(await runner.forward(request_1)).toHaveLength(2);
  expect(await runner.forward(request_2)).toHaveLength(2);

  expect(await runner.backward('78')).toHaveLength(2);

  runner.destroy();
});
