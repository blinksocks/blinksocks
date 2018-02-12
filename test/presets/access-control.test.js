import path from 'path';
import {
  PRESET_FAILED,
  CONNECT_TO_REMOTE,
  CONNECTION_CREATED,
  CONNECTION_CLOSED
} from '../../src/presets';
import {PresetRunner, sleep} from '../common';

test('running on both client and server', async () => {
  const runner = new PresetRunner({
    name: 'access-control',
    params: {
      acl: path.join(__dirname, 'acl.txt')
    }
  }, {
    IS_CLIENT: true,
    IS_SERVER: false
  });

  await sleep(20);

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

  runner.notify({type: PRESET_FAILED});
  runner.notify({type: CONNECTION_CLOSED});
});
