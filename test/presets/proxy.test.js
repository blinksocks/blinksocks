import {PresetRunner, setGlobals} from '../common';

async function doHandshake(runner) {
  runner.on('broadcast', (action) => {
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
    name: 'proxy'
  }, {
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });
  await doHandshake(runner);
  setGlobals({
    __IS_CLIENT__: false,
    __IS_SERVER__: true
  });
  await doHandshake(runner);
});
