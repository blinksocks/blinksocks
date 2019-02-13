"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ssrAuthAes = _interopRequireDefault(require("./ssr-auth-aes128"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class SsrAuthAes128Sha1Preset extends _ssrAuthAes.default {
  constructor(props) {
    super(props);
    this._hashFunc = 'sha1';
    this._salt = 'auth_aes128_sha1';
  }

}

exports.default = SsrAuthAes128Sha1Preset;