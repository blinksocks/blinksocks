import ProxyPreset from './proxy';
import StatsPreset from './stats';
import ExpBaseWithPaddingPreset from './exp-base-with-padding';
import ExpBaseAuthStreamPreset from './exp-base-auth-stream';
import SsBasePreset from './ss-base';
import SsStreamCipherPreset from './ss-stream-cipher';
import SsAeadCipherPreset from './ss-aead-cipher';
import AeadRandomCipherPreset from './aead-random-cipher';
import ObfsHttpPreset from './obfs-http';
import ObfsTls12TicketPreset from './obfs-tls1.2-ticket';

const mapping = {
  'proxy': ProxyPreset,
  'stats': StatsPreset,
  'exp-base-with-padding': ExpBaseWithPaddingPreset,
  'exp-base-auth-stream': ExpBaseAuthStreamPreset,
  'ss-base': SsBasePreset,
  'ss-stream-cipher': SsStreamCipherPreset,
  'ss-aead-cipher': SsAeadCipherPreset,
  'aead-random-cipher': AeadRandomCipherPreset,
  'obfs-http': ObfsHttpPreset,
  'obfs-tls1.2-ticket': ObfsTls12TicketPreset
};

function getPresetClassByName(name) {
  const clazz = mapping[name];
  if (clazz === undefined) {
    throw Error(`cannot find preset: "${name}"`);
  }
  return clazz;
}

export {getPresetClassByName};
