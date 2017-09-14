import {getPresetClassByName} from '../../src/presets';
import {PresetRunner} from '../common';

async function doTunnel(runner) {
  runner.preset.broadcast = jest.fn((action) => {
    expect(action).toMatchSnapshot();
    action.payload.onConnected();
  });

  // just payload
  expect(await runner.forward('12')).toMatchSnapshot();
  expect(await runner.forward('34')).toMatchSnapshot();

  // just payload
  expect(await runner.backward('56')).toMatchSnapshot();
  expect(await runner.backward('78')).toMatchSnapshot();
}

test('running on both client and server', async () => {
  const runner = new PresetRunner({
    clazz: getPresetClassByName('tunnel'),
    params: {
      host: 'example.com',
      port: 443
    }
  }, {
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });
  await doTunnel(runner);
  runner.setGlobals({
    __IS_CLIENT__: false,
    __IS_SERVER__: true
  });
  await doTunnel(runner);
});
