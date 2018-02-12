import {CONNECT_TO_REMOTE} from '../../src/presets';
import {PresetRunner} from '../common';

test('running on client', async () => {
  const runner = new PresetRunner({
    name: 'ss-base'
  }, {
    IS_CLIENT: true,
    IS_SERVER: false
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
  // should decode address info correctly
  const headers = [
    [1, 0, 0, 0, 0, 1, 187],
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 187],
    [3, 11, 101, 120, 97, 109, 112, 108, 101, 46, 99, 111, 109, 1, 187]
  ];

  for (const header of headers) {
    const runner = new PresetRunner({
      name: 'ss-base'
    }, {
      IS_CLIENT: false,
      IS_SERVER: true
    });

    runner.on('broadcast', (action) => {
      expect(action).toMatchSnapshot();
      action.payload.onConnected();
    });

    const handshakeBuf = Buffer.from([
      ...header,
      0, 0, 0, 0 // payload
    ]);
    expect(await runner.forward(handshakeBuf)).toMatchSnapshot();

    // just payload
    expect(await runner.forward('12')).toMatchSnapshot();

    // just payload
    expect(await runner.backward('34')).toMatchSnapshot();
  }
});
