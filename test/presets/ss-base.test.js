import {getPresetClassByName, CONNECT_TO_REMOTE} from '../../src/presets';
import PresetRunner from '../common/preset-runner';

const runner = new PresetRunner({
  clazz: getPresetClassByName('ss-base'),
  params: {}
});

test('running on client', async () => {
  runner.setGlobals({__IS_CLIENT__: true});
  runner.notify({type: CONNECT_TO_REMOTE, payload: {host: '', port: ''}});
  // expect(await runner.forward('0000')).toBe('0000');
  // expect(await runner.backward('0000')).toBe('0000');
});
