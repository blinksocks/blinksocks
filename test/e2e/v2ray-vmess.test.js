import clone from 'lodash.clonedeep';
import run from '../common/run-e2e';

const client = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD"
  }
};

const server = {
  "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD"
};

test('v2ray-vmess, none', async () => {
  const presets = [{
    "name": "v2ray-vmess",
    "params": {
      "id": "c2485913-4e9e-41eb-8cc5-b2e7db8d3bc7",
      "security": "none"
    }
  }];
  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.presets = presets;
  serverJson.presets = presets;

  await run({clientJson, serverJson});
});

test('v2ray-vmess, aes-128-gcm', async () => {
  const presets = [{
    "name": "v2ray-vmess",
    "params": {
      "id": "c2485913-4e9e-41eb-8cc5-b2e7db8d3bc7",
      "security": "aes-128-gcm"
    }
  }];
  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.presets = presets;
  serverJson.presets = presets;

  await run({clientJson, serverJson});
});
