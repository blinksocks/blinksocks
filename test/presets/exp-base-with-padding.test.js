import {CONNECT_TO_REMOTE} from '../../src/presets';
import {PresetRunner} from '../common';

test('running on client', async () => {
  let runner = new PresetRunner({
    name: 'exp-base-with-padding',
    params: {
      salt: 'any string'
    }
  }, {
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

  const request = await runner.forward('12');
  expect(request).toMatchSnapshot();
  expect(await runner.forward('34')).toMatchSnapshot();
  expect(await runner.backward('56')).toMatchSnapshot();
  expect(await runner.backward('78')).toMatchSnapshot();

  // server
  runner = new PresetRunner({
    name: 'exp-base-with-padding',
    params: {
      salt: 'any string'
    }
  }, {
    __IS_CLIENT__: false,
    __IS_SERVER__: true
  });

  runner.on('broadcast', (action) => {
    expect(action).toMatchSnapshot();
    action.payload.onConnected();
  });

  expect(await runner.forward(request)).toMatchSnapshot();
  expect(await runner.forward('12')).toMatchSnapshot();
  expect(await runner.backward('34')).toMatchSnapshot();
  expect(await runner.backward('56')).toMatchSnapshot();

  runner.destroy();
});
