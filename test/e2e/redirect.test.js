import run from "../common/run-e2e";

const serverJson = {
  'service': 'tcp://127.0.0.1:1081',
  'key': 'xxxxxxxxxxxx',
  'presets': [
    { 'name': 'ss-base' },
    { 'name': 'ss-aead-cipher' },
  ],
  'redirect': '127.0.0.1:8080',
};

test('redirect', async () => {
  await run({ proxy: null, serverJson, targetHost: '127.0.0.1', targetPort: 1081 });
});
