'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.builtInPresetMap = undefined;
exports.getPresetClassByName = getPresetClassByName;

var _defs = require('./defs');

Object.keys(_defs).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _defs[key];
    }
  });
});

var _mux = require('./_mux');

var _mux2 = _interopRequireDefault(_mux);

var _baseAuth = require('./base-auth');

var _baseAuth2 = _interopRequireDefault(_baseAuth);

var _ssBase = require('./ss-base');

var _ssBase2 = _interopRequireDefault(_ssBase);

var _ssStreamCipher = require('./ss-stream-cipher');

var _ssStreamCipher2 = _interopRequireDefault(_ssStreamCipher);

var _ssAeadCipher = require('./ss-aead-cipher');

var _ssAeadCipher2 = _interopRequireDefault(_ssAeadCipher);

var _ssrAuthAes128Md = require('./ssr-auth-aes128-md5');

var _ssrAuthAes128Md2 = _interopRequireDefault(_ssrAuthAes128Md);

var _ssrAuthAes128Sha = require('./ssr-auth-aes128-sha1');

var _ssrAuthAes128Sha2 = _interopRequireDefault(_ssrAuthAes128Sha);

var _ssrAuthChainA = require('./ssr-auth-chain-a');

var _ssrAuthChainA2 = _interopRequireDefault(_ssrAuthChainA);

var _ssrAuthChainB = require('./ssr-auth-chain-b');

var _ssrAuthChainB2 = _interopRequireDefault(_ssrAuthChainB);

var _v2rayVmess = require('./v2ray-vmess');

var _v2rayVmess2 = _interopRequireDefault(_v2rayVmess);

var _obfsRandomPadding = require('./obfs-random-padding');

var _obfsRandomPadding2 = _interopRequireDefault(_obfsRandomPadding);

var _obfsHttp = require('./obfs-http');

var _obfsHttp2 = _interopRequireDefault(_obfsHttp);

var _obfsTls = require('./obfs-tls1.2-ticket');

var _obfsTls2 = _interopRequireDefault(_obfsTls);

var _aeadRandomCipher = require('./aead-random-cipher');

var _aeadRandomCipher2 = _interopRequireDefault(_aeadRandomCipher);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function checkPresetClass(clazz) {
  if (typeof clazz !== 'function') {
    return false;
  }

  const requiredMethods = ['onDestroy', 'onInit', 'beforeOut', 'beforeIn', 'clientOut', 'serverIn', 'serverOut', 'clientIn', 'beforeOutUdp', 'beforeInUdp', 'clientOutUdp', 'serverInUdp', 'serverOutUdp', 'clientInUdp'];
  if (requiredMethods.some(method => typeof clazz.prototype[method] !== 'function')) {
    return false;
  }
  const requiredStaticMethods = ['onCheckParams', 'onCache'];
  return !requiredStaticMethods.some(method => typeof clazz[method] !== 'function');
}

const builtInPresetMap = exports.builtInPresetMap = {
  'mux': _mux2.default,

  'base-auth': _baseAuth2.default,

  'ss-base': _ssBase2.default,
  'ss-stream-cipher': _ssStreamCipher2.default,
  'ss-aead-cipher': _ssAeadCipher2.default,

  'ssr-auth-aes128-md5': _ssrAuthAes128Md2.default,
  'ssr-auth-aes128-sha1': _ssrAuthAes128Sha2.default,
  'ssr-auth-chain-a': _ssrAuthChainA2.default,
  'ssr-auth-chain-b': _ssrAuthChainB2.default,

  'v2ray-vmess': _v2rayVmess2.default,

  'obfs-random-padding': _obfsRandomPadding2.default,
  'obfs-http': _obfsHttp2.default,
  'obfs-tls1.2-ticket': _obfsTls2.default,

  'aead-random-cipher': _aeadRandomCipher2.default
};

function getPresetClassByName(name, allowPrivate = false) {
  let clazz = builtInPresetMap[name];
  if (clazz === undefined) {
    try {
      clazz = require(name);
    } catch (err) {
      throw Error(`cannot load preset "${name}" from built-in modules or external`);
    }
    if (!checkPresetClass(clazz)) {
      throw Error(`definition of preset "${name}" is invalid`);
    }
  }
  if (!allowPrivate && clazz.isPrivate) {
    throw Error(`cannot load private preset "${name}"`);
  }
  return clazz;
}