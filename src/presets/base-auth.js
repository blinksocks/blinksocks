import crypto from 'crypto';
import {EVP_BytesToKey, numberToBuffer, hmac, hash} from '../utils';
import {IPreset, CONNECT_TO_REMOTE} from './defs';

// available HMACs and length
const HMAC_METHODS = {
  'md5': 16, 'sha1': 20, 'sha256': 32
};

const DEFAULT_HASH_METHOD = 'sha1';

/**
 * @description
 *   Deliver destination address and verify it using HMAC as well.
 *
 * @params
 *   method: The hash algorithm for HMAC, default is "sha1".
 *
 * @examples
 *   {
 *     "name": "base-auth",
 *     "params": {
 *       "method": "sha1"
 *     }
 *   }
 *
 * @protocol
 *
 *   # TCP stream (client -> server)
 *   +------+----------+----------+----------+----------+---------+
 *   | ALEN | DST.ADDR | DST.PORT |   HMAC   |   DATA   |   ...   |
 *   +------+----------+----------+----------+----------+---------+
 *   |  1   | Variable |    2     |  Fixed   | Variable |   ...   |
 *   +------+----------+----------+----------+----------+---------+
 *   |<------ aes-128-cfb ------->|
 *
 *   # UDP packet (client -> server)
 *   +------+----------+----------+----------+----------+
 *   | ALEN | DST.ADDR | DST.PORT |   HMAC   |   DATA   |
 *   +------+----------+----------+----------+----------+
 *   |  1   | Variable |    2     |  Fixed   | Variable |
 *   +------+----------+----------+----------+----------+
 *
 *   # any others of TCP and UDP
 *   +----------+
 *   |   DATA   |
 *   +----------+
 *   | Variable |
 *   +----------+
 *
 * @explain
 *   1. ALEN = len(DST.ADDR).
 *   2. HMAC = HMAC(AES-128-CFB(ALEN + DST.ADDR + DST.PORT)).
 *   3. IV for encryption is md5(user_key + 'base-auth').
 *   4. key for encryption and HMAC are derived from EVP_BytesToKey.
 */
export default class BaseAuthPreset extends IPreset {

  static hmacMethod = DEFAULT_HASH_METHOD;

  static hmacLen = null;

  static hmacKey = null;

  _cipher = null;

  _decipher = null;

  _isConnecting = false;

  _isHeaderSent = false;

  _isHeaderRecv = false;

  _pending = Buffer.alloc(0);

  _host = null; // buffer

  _port = null; // buffer

  static checkParams({method = DEFAULT_HASH_METHOD}) {
    const methods = Object.keys(HMAC_METHODS);
    if (!methods.includes(method)) {
      throw Error(`base-auth 'method' must be one of [${methods}]`);
    }
  }

  static onInit({method = DEFAULT_HASH_METHOD}) {
    BaseAuthPreset.hmacMethod = method;
    BaseAuthPreset.hmacLen = HMAC_METHODS[method];
    BaseAuthPreset.hmacKey = EVP_BytesToKey(__KEY__, 16, 16);
  }

  constructor() {
    super();
    const {hmacKey: key} = BaseAuthPreset;
    const iv = hash('md5', Buffer.from(__KEY__ + 'base-auth'));
    if (__IS_CLIENT__) {
      this._cipher = crypto.createCipheriv('aes-128-cfb', key, iv);
    } else {
      this._decipher = crypto.createDecipheriv('aes-128-cfb', key, iv);
    }
  }

  onDestroy() {
    this._cipher = null;
    this._decipher = null;
    this._pending = null;
    this._host = null;
    this._port = null;
  }

  onNotified(action) {
    if (__IS_CLIENT__ && action.type === CONNECT_TO_REMOTE) {
      const {host, port} = action.payload;
      this._host = Buffer.from(host);
      this._port = numberToBuffer(port);
    }
  }

  encodeHeader() {
    const {hmacMethod, hmacKey} = BaseAuthPreset;
    const header = Buffer.concat([numberToBuffer(this._host.length, 1), this._host, this._port]);
    const encHeader = this._cipher.update(header);
    const mac = hmac(hmacMethod, hmacKey, encHeader);
    return Buffer.concat([encHeader, mac]);
  }

  decodeHeader({buffer, fail}) {
    const {hmacMethod, hmacLen, hmacKey} = BaseAuthPreset;

    // minimal length required
    if (buffer.length < 31) {
      return fail(`length is too short: ${buffer.length}, dump=${buffer.toString('hex')}`);
    }

    // decrypt the first byte and check length overflow
    const alen = this._decipher.update(buffer.slice(0, 1))[0];
    if (buffer.length <= 1 + alen + 2 + hmacLen) {
      return fail(`unexpected length: ${buffer.length}, dump=${buffer.toString('hex')}`);
    }

    // check hmac
    const givenHmac = buffer.slice(1 + alen + 2, 1 + alen + 2 + hmacLen);
    const expHmac = hmac(hmacMethod, hmacKey, buffer.slice(0, 1 + alen + 2));
    if (!givenHmac.equals(expHmac)) {
      return fail(`unexpected HMAC=${givenHmac.toString('hex')} want=${expHmac.toString('hex')} dump=${buffer.slice(0, 60).toString('hex')}`);
    }

    // decrypt the following bytes
    const plaintext = this._decipher.update(buffer.slice(1, 1 + alen + 2));

    // addr, port, data
    const addr = plaintext.slice(0, alen).toString();
    const port = plaintext.slice(alen, alen + 2).readUInt16BE(0);
    const data = buffer.slice(1 + alen + 2 + hmacLen);

    return {host: addr, port, data};
  }

  // tcp

  clientOut({buffer}) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      return Buffer.concat([this.encodeHeader(), buffer]);
    } else {
      return buffer;
    }
  }

  serverIn({buffer, next, broadcast, fail}) {
    if (!this._isHeaderRecv) {

      if (this._isConnecting) {
        this._pending = Buffer.concat([this._pending, buffer]);
        return;
      }

      const decoded = this.decodeHeader({buffer, fail});
      if (!decoded) {
        return;
      }

      const {host, port, data} = decoded;

      // notify to connect to the real server
      this._isConnecting = true;
      broadcast({
        type: CONNECT_TO_REMOTE,
        payload: {
          host: host,
          port: port,
          onConnected: () => {
            next(Buffer.concat([data, this._pending]));
            this._isHeaderRecv = true;
            this._isConnecting = false;
            this._pending = null;
          }
        }
      });
    } else {
      return buffer;
    }
  }

  // udp

  clientOutUdp({buffer}) {
    return Buffer.concat([this.encodeHeader(), buffer]);
  }

  serverInUdp({buffer, next, broadcast, fail}) {
    const decoded = this.decodeHeader({buffer, fail});
    if (!decoded) {
      return;
    }
    const {host, port, data} = decoded;
    broadcast({
      type: CONNECT_TO_REMOTE,
      payload: {
        host: host,
        port: port,
        onConnected: () => next(data)
      }
    });
  }

}
