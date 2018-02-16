import {Middleware} from '../../../src/core/middleware';

test('Middleware#constructor', () => {
  expect(() => new Middleware({preset: {'name': 'unknown-preset'}})).toThrow();
});

test('Middleware#hasListener', () => {
  const middleware = new Middleware({preset: {'name': 'ss-base'}});
  expect(middleware.hasListener('event')).toBe(false);
});

test('Middleware#onPresetNext', () => {
  const middleware = new Middleware({preset: {'name': 'ss-base'}});
  middleware.on('next_1', (arg) => {
    expect(arg).toBe(null);
  });
  middleware.onPresetNext(1, null);
});

test('Middleware#getImplement', () => {
  const middleware = new Middleware({preset: {'name': 'ss-base'}});
  expect(middleware.getImplement()).toBeDefined();
});
