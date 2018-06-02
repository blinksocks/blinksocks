import { getPresetClassByName } from '../../../src/presets';

test('getPresetClassByName, fail', () => {
  expect(() => getPresetClassByName('_unknown_')).toThrow();
  expect(() => getPresetClassByName('mux')).toThrow();
  expect(() => getPresetClassByName(require.resolve('./mock_invalid_preset_a'))).toThrow();
  expect(() => getPresetClassByName(require.resolve('./mock_invalid_preset_b'))).toThrow();
});

test('getPresetClassByName, success', () => {
  expect(() => getPresetClassByName('ss-base')).not.toThrow();
  expect(() => getPresetClassByName(require.resolve('./mock_valid_preset'))).not.toThrow();
});
