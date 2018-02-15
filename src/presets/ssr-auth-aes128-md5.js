import SsrAuthAes128Preset from './ssr-auth-aes128';

/**
 * @description
 *   shadowsocksr "auth_aes128_md5" implementation.
 *
 * @notice
 *   This preset should be used together with "ss-base" and "ss-stream-cipher".
 *
 * @examples
 *   [
 *     {"name": "ss-base"},
 *     {"name": "ssr-auth-aes128-md5"},
 *     {"name": "ss-stream-cipher","params": {"method": "aes-128-ctr"}}
 *   ]
 */
export default class SsrAuthAes128Md5Preset extends SsrAuthAes128Preset {

  constructor(props) {
    super(props);
    this._hashFunc = 'md5';
    this._salt = 'auth_aes128_md5';
  }

}
