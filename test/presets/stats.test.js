import path from 'path';
import {getPresetClassByName, PRESET_FAILED, CONNECTION_CREATED, CONNECTION_CLOSED} from '../../src/presets';
import {PresetRunner, sleep} from '../common';

test('running on both client and server', async () => {
  const runner = new PresetRunner({
    clazz: getPresetClassByName('stats'),
    params: {
      save_to: path.resolve(__dirname, '../tmp/stats.json'),
      sample_interval: 1,
      save_interval: 1
    }
  }, {
    __IS_CLIENT__: true,
    __IS_SERVER__: false
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
