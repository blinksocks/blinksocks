import {CONNECT_TO_REMOTE} from '../../src/presets';
import {PresetRunner} from '../common';

test('tcp relay on client and server', async () => {
  let runner = new PresetRunner({
    name: 'base-auth'
  }, {
    KEY: 'secret',
    IS_CLIENT: true,
    IS_SERVER: false
  });

  // client
  runner.notify({
    type: CONNECT_TO_REMOTE,
    payload: {
      host: 'example.com',
      port: 443
    }
  });

  const packet_1 = await runner.forward('12');

  // should carry address info of above
  expect(packet_1).toMatchSnapshot();
  // just payload
  expect(await runner.forward('34')).toMatchSnapshot();

  // just payload
  expect(await runner.backward('56')).toMatchSnapshot();

  runner.destroy();

  // server

  runner = new PresetRunner({
    name: 'base-auth'
  }, {
    KEY: 'secret',
    IS_CLIENT: false,
    IS_SERVER: true
  });

  runner.on('broadcast', (action) => {
    expect(action).toMatchSnapshot();
    action.payload.onConnected();
  });

  expect(await runner.forward(packet_1)).toMatchSnapshot();

  // just payload
  expect(await runner.forward('12')).toMatchSnapshot();

  // just payload
  expect(await runner.backward('34')).toMatchSnapshot();

  runner.destroy();
});

test('udp relay on client and server', async () => {
  let runner = new PresetRunner({
    name: 'base-auth'
  }, {
    KEY: 'secret',
    IS_CLIENT: true,
    IS_SERVER: false
  });

  // client
  runner.notify({
    type: CONNECT_TO_REMOTE,
    payload: {
      host: 'example.com',
      port: 443
    }
  });

  const packet_1 = await runner.forwardUdp('12');

  expect(packet_1).toMatchSnapshot();
  expect(await runner.backwardUdp('34')).toMatchSnapshot();

  runner.destroy();

  // server
  runner = new PresetRunner({
    name: 'base-auth'
  }, {
    KEY: 'secret',
    IS_CLIENT: false,
    IS_SERVER: true
  });

  runner.on('broadcast', (action) => {
    expect(action).toMatchSnapshot();
    action.payload.onConnected();
  });

  expect(await runner.forwardUdp(packet_1)).toMatchSnapshot();
  expect(await runner.backwardUdp('34')).toMatchSnapshot();

  runner.destroy();
});
