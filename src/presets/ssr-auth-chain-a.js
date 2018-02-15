import SsrAuthChainPreset from './ssr-auth-chain';

/**
 * @description
 *   shadowsocksr "auth_chain_a" implementation.
 *
 * @notice
 *   This preset should be used together with "ss-base" and "ss-stream-cipher".
 *
 * @examples
 *   [
 *     {"name": "ss-base"},
 *     {"name": "ssr-auth-chain-a"},
 *     {"name": "ss-stream-cipher","params": {"method": "aes-128-ctr"}}
 *   ]
 */
export default class SsrAuthChainAPreset extends SsrAuthChainPreset {

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
