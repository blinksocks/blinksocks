import {IPreset, IPresetStatic, checkPresetClass} from '../defs';

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

test('should return false if class is not a function', () => {
  expect(checkPresetClass(null)).toBe(false);
});

test('should return false if class is not meet requirements', () => {
  const clazz = class A {
  };
  expect(checkPresetClass(clazz)).toBe(false);
});

test('should return true if class is a valid preset', () => {
  const clazz = class A extends IPreset {
  };
  expect(checkPresetClass(clazz)).toBe(true);
});
