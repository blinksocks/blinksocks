import {getPresetClassByName, CONNECTION_CREATED, CONNECT_TO_REMOTE, CONNECTION_CLOSED} from '../../src/presets';
import {PresetRunner} from '../common';

test('running on both client and server', async () => {
  const runner = new PresetRunner({
    clazz: getPresetClassByName('tracker')
  }, {
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });

  const actionPayload = {
    payload: {
      host: 'example.com',
      port: 443
    }
  };
  runner.notify({type: CONNECT_TO_REMOTE, ...actionPayload});
  runner.notify({type: CONNECTION_CREATED, ...actionPayload});

  expect(await runner.forward('12')).toMatchSnapshot();
  expect(await runner.forward('34')).toMatchSnapshot();

  expect(await runner.backward('56')).toMatchSnapshot();
  expect(await runner.backward('78')).toMatchSnapshot();

  runner.notify({type: CONNECTION_CLOSED});
});
