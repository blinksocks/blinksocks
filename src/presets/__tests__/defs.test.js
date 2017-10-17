import {IPreset, IPresetStatic} from '../defs';

test('IPreset#onNotified', () => {
  const preset = new IPreset();
  expect(preset.onNotified(null)).toBe(false);
});

test('IPreset#onDestroy', () => {
  const preset = new IPreset();
  expect(preset.onDestroy()).toBe(undefined);
});

test('IPresetStatic#constructor', () => {
  expect(() => new IPresetStatic()).not.toThrow();
  expect(() => new IPresetStatic()).toThrow();
});
