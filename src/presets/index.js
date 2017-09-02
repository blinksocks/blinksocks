import ProxyPreset from './proxy';
import TunnelPreset from './tunnel';
import StatsPreset from './stats';
import TrackerPreset from './tracker';
import ExpCompressPreset from './exp-compress';
import ExpBaseWithPaddingPreset from './exp-base-with-padding';
import ExpBaseAuthStreamPreset from './exp-base-auth-stream';
import SsBasePreset from './ss-base';
import SsStreamCipherPreset from './ss-stream-cipher';
import SsAeadCipherPreset from './ss-aead-cipher';
import AeadRandomCipherPreset from './aead-random-cipher';
import ObfsHttpPreset from './obfs-http';
import ObfsTls12TicketPreset from './obfs-tls1.2-ticket';
import ObfsRandomPaddingPreset from './obfs-random-padding';

const mapping = {
  'proxy': ProxyPreset,
  'tunnel': TunnelPreset,
  'stats': StatsPreset,
  'tracker': TrackerPreset,
  'exp-compress': ExpCompressPreset,
  'exp-base-with-padding': ExpBaseWithPaddingPreset,
  'exp-base-auth-stream': ExpBaseAuthStreamPreset,
  'ss-base': SsBasePreset,
  'ss-stream-cipher': SsStreamCipherPreset,
  'ss-aead-cipher': SsAeadCipherPreset,
  'aead-random-cipher': AeadRandomCipherPreset,
  'obfs-http': ObfsHttpPreset,
  'obfs-tls1.2-ticket': ObfsTls12TicketPreset,
  'obfs-random-padding': ObfsRandomPaddingPreset
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
