import path from 'path';
import mkdirp from 'mkdirp';
import {PRESET_FAILED, CONNECTION_CREATED, CONNECTION_CLOSED} from '../../src/presets';
import {PresetRunner, sleep} from '../common';

test('running on both client and server', async () => {
  mkdirp.sync(path.resolve(__dirname, '../tmp'));
  const runner = new PresetRunner({
    name: 'stats',
    params: {
      save_to: path.resolve(__dirname, '../tmp/stats.json'),
      sample_interval: 1,
      save_interval: 1
    }
  }, {
    is_client: true,
    is_server: false
  });

  runner.notify({type: CONNECTION_CREATED});
  runner.notify({type: PRESET_FAILED});
  runner.notify({type: CONNECTION_CLOSED});

  expect(await runner.forward('12')).toMatchSnapshot();
  expect(await runner.forward('34')).toMatchSnapshot();

  expect(await runner.backward('56')).toMatchSnapshot();
  expect(await runner.backward('78')).toMatchSnapshot();

  await sleep(1e3);

  runner.destroy();
});
