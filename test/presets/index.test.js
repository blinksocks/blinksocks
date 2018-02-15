import {getPresetClassByName} from '../../src/presets';

test('should return a preset class', () => {
  expect(getPresetClassByName('ss-base')).toBeDefined();
});

test('should throw if no preset class found', () => {
  expect(() => getPresetClassByName('???')).toThrow();
});
