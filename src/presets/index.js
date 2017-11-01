import {checkPresetClass} from './defs';

// functional
import StatsPreset from './stats';
import TrackerPreset from './tracker';
import AccessControlPreset from './access-control';

// basic
import BaseAuthPreset from './base-auth';

// shadowsocks
import SsBasePreset from './ss-base';
import SsStreamCipherPreset from './ss-stream-cipher';
import SsAeadCipherPreset from './ss-aead-cipher';

// shadowsocksr
import SsrAuthAes128Md5Preset from './ssr-auth-aes128-md5';
import SsrAuthAes128Sha1Preset from './ssr-auth-aes128-sha1';

// v2ray
import V2rayVmessPreset from './v2ray-vmess';

// obfuscator
import ObfsRandomPaddingPreset from './obfs-random-padding';
import ObfsHttpPreset from './obfs-http';
import ObfsTls12TicketPreset from './obfs-tls1.2-ticket';

// others
import AeadRandomCipherPreset from './aead-random-cipher';

// legacy presets for backward compatibility
import BaseWithPaddingPreset from './_base-with-padding';
import BaseAuthStreamPreset from './_base-auth-stream';

const mapping = {
  // functional
  'stats': StatsPreset,
  'tracker': TrackerPreset,
  'access-control': AccessControlPreset,

  // basic
  'base-auth': BaseAuthPreset,

  // shadowsocks
  'ss-base': SsBasePreset,
  'ss-stream-cipher': SsStreamCipherPreset,
  'ss-aead-cipher': SsAeadCipherPreset,

  // shadowsocksr
  'ssr-auth-aes128-md5': SsrAuthAes128Md5Preset,
  'ssr-auth-aes128-sha1': SsrAuthAes128Sha1Preset,

  // v2ray
  'v2ray-vmess': V2rayVmessPreset,

  // obfuscator
  'obfs-random-padding': ObfsRandomPaddingPreset,
  'obfs-http': ObfsHttpPreset,
  'obfs-tls1.2-ticket': ObfsTls12TicketPreset,

  // others
  'aead-random-cipher': AeadRandomCipherPreset
};

const legacy = {
  'base-with-padding': BaseWithPaddingPreset,
  'base-auth-stream': BaseAuthStreamPreset
};

const presets = Object.keys(mapping);
const legacyPresets = Object.keys(legacy);

function getPresetClassByName(name) {
  let clazz = {...mapping, ...legacy}[name];
  if (clazz === undefined) {
    try {
      clazz = require(name);
    } catch (err) {
      throw Error(`cannot find preset: "${name}" from built-in modules or external: ${err.message}`);
    }
    if (!checkPresetClass(clazz)) {
      throw Error(`definition of preset "${name}" is invalid`);
    }
  }
  return clazz;
}

export {getPresetClassByName, presets, legacyPresets};
export * from './defs';
