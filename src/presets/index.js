import {checkPresetClass} from './defs';

// functional
import StatsPreset from './stats';
import TrackerPreset from './tracker';
import AccessControlPreset from './access-control';
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

function monkeyPatch(clazz) {
  // patch onInit()
  clazz.onInit = (function (onInit) {
    return function _onInit(...args) {
      if (!clazz.initialized) {
        onInit(...args);
        clazz.initialized = true;
      }
    };
  })(clazz.onInit);

  // patch checkParams()
  clazz.checkParams = (function (checkParams) {
    return function _checkParams(...args) {
      if (!clazz.checked) {
        checkParams(...args);
        clazz.checked = true;
      }
    };
  })(clazz.checkParams);
}

const mapping = {
  // functional
  'stats': StatsPreset,
  'tracker': TrackerPreset,
  'access-control': AccessControlPreset,
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

const presetClasses = {...mapping};

Object.keys(presetClasses).forEach((clazzName) => monkeyPatch(presetClasses[clazzName]));

export function getPresetClassByName(name) {
  let clazz = presetClasses[name];
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

export const presets = Object.keys(mapping);
export * from './defs';
