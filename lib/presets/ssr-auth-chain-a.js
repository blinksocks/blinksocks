"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ssrAuthChain = _interopRequireDefault(require("./ssr-auth-chain"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class SsrAuthChainAPreset extends _ssrAuthChain.default {
  constructor(props) {
    super(props);
    this._salt = 'auth_chain_a';
  }

  getRandomBytesLengthForTcp(seed, base, rng) {
    if (base > 1440) {
      return 0;
    }

    rng.init_from_bin_datalen(seed, base);
    let random_bytes_len;

    if (base > 1300) {
      random_bytes_len = rng.next().mod(31);
    } else if (base > 900) {
      random_bytes_len = rng.next().mod(127);
    } else if (base > 400) {
      random_bytes_len = rng.next().mod(521);
    } else {
      random_bytes_len = rng.next().mod(1021);
    }

    return random_bytes_len.toNumber();
  }

}

exports.default = SsrAuthChainAPreset;