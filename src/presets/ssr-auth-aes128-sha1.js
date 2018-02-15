import SsrAuthAes128Preset from './ssr-auth-aes128';

/**
 * @description
 *   shadowsocksr "auth_aes128_sha1" implementation.
 *
 * @notice
 *   This preset should be used together with "ss-base" and "ss-stream-cipher".
 *
 * @examples
 *   [
 *     {"name": "ss-base"},
 *     {"name": "ssr-auth-aes128-sha1"},
 *     {"name": "ss-stream-cipher","params": {"method": "aes-128-ctr"}}
 *   ]
 */
export default class SsrAuthAes128Sha1Preset extends SsrAuthAes128Preset {

  constructor(props) {
    super(props);
    this._hashFunc = 'sha1';
    this._salt = 'auth_aes128_sha1';
  }

}
