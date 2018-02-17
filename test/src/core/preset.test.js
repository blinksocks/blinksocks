import { Preset } from '../../../src';

test('Preset#constructor', () => {
  expect(() => new Preset({ preset: { 'name': 'unknown-preset' } })).toThrow();
});

test('Preset#hasListener', () => {
  const preset = new Preset({ preset: { 'name': 'ss-base' } });
  expect(preset.hasListener('event')).toBe(false);
});

test('Preset#onPresetNext', () => {
  const preset = new Preset({ preset: { 'name': 'ss-base' } });
  preset.on('next_1', (arg) => {
    expect(arg).toBe(null);
  });
  preset.onPresetNext(1, null);
});

test('Preset#getImplement', () => {
  const preset = new Preset({ preset: { 'name': 'ss-base' } });
  expect(preset.getImplement()).toBeDefined();
});
