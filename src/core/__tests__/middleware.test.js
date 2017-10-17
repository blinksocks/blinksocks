import {Middleware, createMiddleware} from '../middleware';

test('Middleware#hasListener', () => {
  const middleware = new Middleware(createMiddleware('ss-base'));
  expect(middleware.hasListener('event')).toBe(false);
});

test('Middleware#onPresetNext', () => {
  const middleware = new Middleware(createMiddleware('ss-base'));
  middleware.on('next_1', (arg) => {
    expect(arg).toBe(null);
  });
  middleware.onPresetNext(1, null);
});

test('createMiddleware', () => {
  expect(() => createMiddleware('unknown-preset')).toThrow();
});
