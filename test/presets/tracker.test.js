import {CONNECTION_CREATED, CONNECT_TO_REMOTE, CONNECTION_CLOSED} from '../../src/presets';
import {PresetRunner} from '../common';

test('tcp relay on client and server', async () => {
  const runner = new PresetRunner({
    name: 'tracker'
  }, {
    IS_CLIENT: true,
    IS_SERVER: false
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

  runner.destroy();
});

test('udp relay on client and server', async () => {
  const runner = new PresetRunner({
    name: 'tracker'
  }, {
    IS_CLIENT: true,
    IS_SERVER: false
  });

  expect(await runner.forwardUdp('12')).toMatchSnapshot();
  expect(await runner.backwardUdp('34')).toMatchSnapshot();

  runner.destroy();
});
