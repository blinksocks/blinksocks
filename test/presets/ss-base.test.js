import {getPresetClassByName, CONNECT_TO_REMOTE} from '../../src/presets';
import {PresetRunner} from '../common';

test('running on client', async () => {
  const runner = new PresetRunner({
    clazz: getPresetClassByName('ss-base')
  }, {
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });

  runner.notify({
    type: CONNECT_TO_REMOTE,
    payload: {
      host: 'example.com',
      port: 443
    }
  });

  // should carry address info of above
  expect(await runner.forward('12')).toMatchSnapshot();
  // just payload
  expect(await runner.forward('34')).toMatchSnapshot();

  // just payload
  expect(await runner.backward('56')).toMatchSnapshot();

  runner.destroy();
});

test('running on server', async () => {
  const runner = new PresetRunner({
    clazz: getPresetClassByName('ss-base')
  }, {
    __IS_CLIENT__: false,
    __IS_SERVER__: true
  });

  const preset = runner.getPreset();
  preset.broadcast = jest.fn((action) => {
    expect(action).toMatchSnapshot();
    action.payload.onConnected();
  });

  // should decode address info correctly
  const header = [3, 11, 101, 120, 97, 109, 112, 108, 101, 46, 99, 111, 109, 1, 187];
  const payload = [0, 0, 0, 0];
  const ret = await runner.forward(Buffer.from(header.concat(payload)));
  expect(ret).toMatchSnapshot();
  expect(preset.broadcast).toHaveBeenCalled();
  // just payload
  expect(await runner.forward('12')).toMatchSnapshot();

  // just payload
  expect(await runner.backward('34')).toMatchSnapshot();
});
