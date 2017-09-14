import {getPresetClassByName} from '../../src/presets';
import {PresetRunner} from '../common';

async function doHandshake(runner) {
  runner.preset.broadcast = jest.fn((action) => {
    expect(action).toMatchSnapshot();
    action.payload.onConnected();
  });

  // socks5 connect
  expect(await runner.forward(Buffer.from('050100030f617069732e676f6f676c652e636f6d01bb', 'hex'))).toMatchSnapshot();
  // just payload
  expect(await runner.forward('12')).toMatchSnapshot();

  // just payload
  expect(await runner.backward('34')).toMatchSnapshot();
  expect(await runner.backward('56')).toMatchSnapshot();
}

test('running on both client and server', async () => {
  const runner = new PresetRunner({
    clazz: getPresetClassByName('proxy')
  }, {
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });
  await doHandshake(runner);
  runner.setGlobals({
    __IS_CLIENT__: false,
    __IS_SERVER__: true
  });
  await doHandshake(runner);
});
