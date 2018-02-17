// functional
import TrackerPreset from './tracker';
import AutoConfPreset from './auto-conf';
import MuxPreset from './mux';

// basic
import BaseAuthPreset from './base-auth';

// shadowsocks
import SsBasePreset from './ss-base';
import SsStreamCipherPreset from './ss-stream-cipher';
import SsAeadCipherPreset from './ss-aead-cipher';

// shadowsocksr
import SsrAuthAes128Md5Preset from './ssr-auth-aes128-md5';
import SsrAuthAes128Sha1Preset from './ssr-auth-aes128-sha1';
import SsrAuthChainAPreset from './ssr-auth-chain-a';
import SsrAuthChainBPreset from './ssr-auth-chain-b';

// v2ray
import V2rayVmessPreset from './v2ray-vmess';

// obfuscator
import ObfsRandomPaddingPreset from './obfs-random-padding';
import ObfsHttpPreset from './obfs-http';
import ObfsTls12TicketPreset from './obfs-tls1.2-ticket';

// others
import AeadRandomCipherPreset from './aead-random-cipher';

const presetMap = {
  // functional
  'tracker': TrackerPreset,
  'auto-conf': AutoConfPreset,
  'mux': MuxPreset,

  // basic
  'base-auth': BaseAuthPreset,

  // shadowsocks
  'ss-base': SsBasePreset,
  'ss-stream-cipher': SsStreamCipherPreset,
  'ss-aead-cipher': SsAeadCipherPreset,

  // shadowsocksr
  'ssr-auth-aes128-md5': SsrAuthAes128Md5Preset,
  'ssr-auth-aes128-sha1': SsrAuthAes128Sha1Preset,
  'ssr-auth-chain-a': SsrAuthChainAPreset,
  'ssr-auth-chain-b': SsrAuthChainBPreset,

  // v2ray
  'v2ray-vmess': V2rayVmessPreset,

  // obfuscator
  'obfs-random-padding': ObfsRandomPaddingPreset,
  'obfs-http': ObfsHttpPreset,
  'obfs-tls1.2-ticket': ObfsTls12TicketPreset,

  // others
  'aead-random-cipher': AeadRandomCipherPreset
};

/**
 * check if a class is a valid preset class
 * @param clazz
 * @returns {boolean}
 */
function checkPresetClass(clazz) {
  if (typeof clazz !== 'function') {
    return false;
  }
  // check require hooks
  const requiredMethods = [
    'onNotified', 'onDestroy', 'onInit',
    'beforeOut', 'beforeIn', 'clientOut', 'serverIn', 'serverOut', 'clientIn',
    'beforeOutUdp', 'beforeInUdp', 'clientOutUdp', 'serverInUdp', 'serverOutUdp', 'clientInUdp'
  ];
  if (requiredMethods.some((method) => typeof clazz.prototype[method] !== 'function')) {
    return false;
  }
  const requiredStaticMethods = ['onCheckParams', 'onCache'];
  if (requiredStaticMethods.some((method) => typeof clazz[method] !== 'function')) {
    return false;
  }
  return true;
}

export function getPresetClassByName(name) {
  let clazz = presetMap[name];
  if (clazz === undefined) {
    try {
      clazz = require(name);
    } catch (err) {
      throw Error(`cannot load preset: "${name}" from built-in modules or external`);
    }
    if (!checkPresetClass(clazz)) {
      throw Error(`definition of preset "${name}" is invalid`);
    }
  }
  return clazz;
}

export const presets = Object.keys(presetMap);
