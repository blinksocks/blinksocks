import {PresetRunner, setGlobals} from '../common';

async function doTunnel(runner) {
  runner.on('broadcast', (action) => {
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
    name: 'tunnel',
    params: {
      host: 'example.com',
      port: 443
    }
  }, {
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });
  await doTunnel(runner);
  setGlobals({
    __IS_CLIENT__: false,
    __IS_SERVER__: true
  });
  await doTunnel(runner);
});
