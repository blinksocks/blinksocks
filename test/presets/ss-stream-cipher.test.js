import {PresetRunner} from '../common';

test('tcp relay on client and server', async () => {
  const runner = new PresetRunner({
    name: 'ss-stream-cipher',
    params: {
      method: 'aes-128-ctr'
    }
  }, {
    key: 'secret',
    is_client: true,
    is_server: false
  });

  // should add 16 more bytes at the beginning
  expect(await runner.forward('1')).toHaveLength(16 + 1);
  // just payload
  expect(await runner.forward('23')).toHaveLength(2);

  // should fail because too short to get iv
  await expect(runner.backward('000000000000000')).rejects.toBeDefined();
  const iv = Buffer.alloc(16);
  // payload is empty
  expect(await runner.backward(iv)).toHaveLength(0);
  // just payload
  expect(await runner.backward('45')).toMatchSnapshot();

  runner.destroy();
});

test('udp relay on client and server', async () => {
  const runner = new PresetRunner({
    name: 'ss-stream-cipher',
    params: {
      method: 'rc4-md5-6'
    }
  }, {
    key: 'secret',
    is_client: true,
    is_server: false
  });

  expect(await runner.forwardUdp('1')).toHaveLength(6 + 1);

  const iv = Buffer.alloc(6);
  expect(await runner.backwardUdp(iv)).toHaveLength(0);
  await expect(runner.backwardUdp('2')).rejects.toBeDefined();

  runner.destroy();
});
