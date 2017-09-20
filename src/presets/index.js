// functional
import ProxyPreset from './proxy';
import TunnelPreset from './tunnel';
import StatsPreset from './stats';
import TrackerPreset from './tracker';
import AccessControlPreset from './access-control';

// basic
import BaseWithPaddingPreset from './base-with-padding';
import BaseAuthStreamPreset from './base-auth-stream';

// shadowsocks
import SsBasePreset from './ss-base';
import SsStreamCipherPreset from './ss-stream-cipher';
import SsAeadCipherPreset from './ss-aead-cipher';

// v2ray
import V2rayVmessPreset from './v2ray-vmess';

// obfuscator
import ObfsRandomPaddingPreset from './obfs-random-padding';
import ObfsHttpPreset from './obfs-http';
import ObfsTls12TicketPreset from './obfs-tls1.2-ticket';

// experimental
import ExpCompressPreset from './exp-compress';

// others
import AeadRandomCipherPreset from './aead-random-cipher';

// legacy presets for backward compatibility
import ExpBaseWithPaddingPreset from './_exp-base-with-padding';
import ExpBaseAuthStreamPreset from './_exp-base-auth-stream';

const mapping = {
  // functional
  'proxy': ProxyPreset,
  'tunnel': TunnelPreset,
  'stats': StatsPreset,
  'tracker': TrackerPreset,
  'access-control': AccessControlPreset,

  // basic
  'base-with-padding': BaseWithPaddingPreset,
  'base-auth-stream': BaseAuthStreamPreset,

  // shadowsocks
  'ss-base': SsBasePreset,
  'ss-stream-cipher': SsStreamCipherPreset,
  'ss-aead-cipher': SsAeadCipherPreset,

  // v2ray
  'v2ray-vmess': V2rayVmessPreset,

  // obfuscator
  'obfs-random-padding': ObfsRandomPaddingPreset,
  'obfs-http': ObfsHttpPreset,
  'obfs-tls1.2-ticket': ObfsTls12TicketPreset,

  // experimental
  'exp-compress': ExpCompressPreset,

  // others
  'aead-random-cipher': AeadRandomCipherPreset
};

const legacy = {
  'exp-base-with-padding': ExpBaseWithPaddingPreset,
  'exp-base-auth-stream': ExpBaseAuthStreamPreset
};

const presets = Object.keys(mapping);
const legacyPresets = Object.keys(legacy);

function getPresetClassByName(name) {
  const clazz = {...mapping, ...legacy}[name];
  if (clazz === undefined) {
    throw Error(`cannot find preset: "${name}"`);
  }
  return clazz;
}

export {getPresetClassByName, presets, legacyPresets};
export * from './defs';
