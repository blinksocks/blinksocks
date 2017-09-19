import {PresetRunner} from '../common';

test('running on both client and server', async () => {
  const runner = new PresetRunner({
    name: 'obfs-random-padding'
  }, {
    __IS_CLIENT__: true,
    __IS_SERVER__: false
  });

  const chunk = await runner.forward('12');
  expect(chunk.length).toBeGreaterThanOrEqual(3 + 2);
  expect(chunk.length).toBeLessThanOrEqual(1 + 255 + 2 + 2);

  expect(await runner.backward(chunk)).toHaveLength(2);

  runner.destroy();
});
