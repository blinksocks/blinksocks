"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ssrAuthAes = _interopRequireDefault(require("./ssr-auth-aes128"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class SsrAuthAes128Md5Preset extends _ssrAuthAes.default {
  constructor(props) {
    super(props);
    this._hashFunc = 'md5';
    this._salt = 'auth_aes128_md5';
  }

}

exports.default = SsrAuthAes128Md5Preset;