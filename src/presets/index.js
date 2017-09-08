// functional
import ProxyPreset from './proxy';
import TunnelPreset from './tunnel';
import StatsPreset from './stats';
import TrackerPreset from './tracker';
import AccessControlPreset from './access-control';

// shadowsocks
import SsBasePreset from './ss-base';
import SsStreamCipherPreset from './ss-stream-cipher';
import SsAeadCipherPreset from './ss-aead-cipher';

// obfuscator
import ObfsRandomPaddingPreset from './obfs-random-padding';
import ObfsHttpPreset from './obfs-http';
import ObfsTls12TicketPreset from './obfs-tls1.2-ticket';

// experimental
import ExpCompressPreset from './exp-compress';
import ExpBaseWithPaddingPreset from './exp-base-with-padding';
import ExpBaseAuthStreamPreset from './exp-base-auth-stream';

// others
import AeadRandomCipherPreset from './aead-random-cipher';

const mapping = {
  // functional
  'proxy': ProxyPreset,
  'tunnel': TunnelPreset,
  'stats': StatsPreset,
  'tracker': TrackerPreset,
  'access-control': AccessControlPreset,

  // shadowsocks
  'ss-base': SsBasePreset,
  'ss-stream-cipher': SsStreamCipherPreset,
  'ss-aead-cipher': SsAeadCipherPreset,

  // obfuscator
  'obfs-random-padding': ObfsRandomPaddingPreset,
  'obfs-http': ObfsHttpPreset,
  'obfs-tls1.2-ticket': ObfsTls12TicketPreset,

  // experimental
  'exp-base-with-padding': ExpBaseWithPaddingPreset,
  'exp-base-auth-stream': ExpBaseAuthStreamPreset,
  'exp-compress': ExpCompressPreset,

  // others
  'aead-random-cipher': AeadRandomCipherPreset
};

const presets = Object.keys(mapping);

function getPresetClassByName(name) {
  const clazz = mapping[name];
  if (clazz === undefined) {
    throw Error(`cannot find preset: "${name}"`);
  }
  return clazz;
}

export {getPresetClassByName, presets};
export * from './defs';
