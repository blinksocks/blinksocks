import crypto from 'crypto';
import { EVP_BytesToKey, numberToBuffer, hmac, hash, dumpHex } from '../utils';
import { IPresetAddressing } from './defs';

// available HMACs and length
const HMAC_METHODS = {
  'md5': 16, 'sha1': 20, 'sha256': 32,
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
export default class BaseAuthPreset extends IPresetAddressing {

  _hmacMethod = DEFAULT_HASH_METHOD;

  _hmacLen = null;

  _hmacKey = null;

  _cipher = null;

  _decipher = null;

  _isConnecting = false;

  _isHeaderSent = false;

  _isHeaderRecv = false;

  _pending = Buffer.alloc(0);

  _host = null; // buffer

  _port = null; // buffer

  static onCheckParams({ method = DEFAULT_HASH_METHOD }) {
    const methods = Object.keys(HMAC_METHODS);
    if (!methods.includes(method)) {
      throw Error(`base-auth 'method' must be one of [${methods}]`);
    }
  }

  onInit({ method = DEFAULT_HASH_METHOD }) {
    const key = EVP_BytesToKey(this._config.key, 16, 16);
    const iv = hash('md5', Buffer.from(this._config.key + 'base-auth'));
    this._hmacMethod = method;
    this._hmacLen = HMAC_METHODS[method];
    this._hmacKey = key;
    if (this._config.is_client) {
      this._cipher = crypto.createCipheriv('aes-128-cfb', key, iv);
    } else {
      this._decipher = crypto.createDecipheriv('aes-128-cfb', key, iv);
    }
  }

  onInitTargetAddress({ host, port }) {
    this._host = Buffer.from(host);
    this._port = numberToBuffer(port);
  }

  onDestroy() {
    this._cipher = null;
    this._decipher = null;
    this._pending = null;
    this._host = null;
    this._port = null;
  }

  encodeHeader() {
    const header = Buffer.concat([numberToBuffer(this._host.length, 1), this._host, this._port]);
    const encHeader = this._cipher.update(header);
    const mac = hmac(this._hmacMethod, this._hmacKey, encHeader);
    return Buffer.concat([encHeader, mac]);
  }

  decodeHeader({ buffer, fail }) {
    const hmacLen = this._hmacLen;

    // minimal length required
    if (buffer.length < 31) {
      return fail(`length is too short: ${buffer.length}, dump=${dumpHex(buffer)}`);
    }

    // decrypt the first byte and check length overflow
    const alen = this._decipher.update(buffer.slice(0, 1))[0];
    if (buffer.length <= 1 + alen + 2 + hmacLen) {
      return fail(`unexpected length: ${buffer.length}, dump=${dumpHex(buffer)}`);
    }

    // check hmac
    const givenHmac = buffer.slice(1 + alen + 2, 1 + alen + 2 + hmacLen);
    const expHmac = hmac(this._hmacMethod, this._hmacKey, buffer.slice(0, 1 + alen + 2));
    if (!givenHmac.equals(expHmac)) {
      return fail(`unexpected HMAC=${dumpHex(givenHmac)} want=${dumpHex(expHmac)} dump=${dumpHex(buffer)}`);
    }

    // decrypt the following bytes
    const plaintext = this._decipher.update(buffer.slice(1, 1 + alen + 2));

    // addr, port, data
    const addr = plaintext.slice(0, alen).toString();
    const port = plaintext.slice(alen, alen + 2).readUInt16BE(0);
    const data = buffer.slice(1 + alen + 2 + hmacLen);

    return { host: addr, port, data };
  }

  // tcp

  clientOut({ buffer }) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      return Buffer.concat([this.encodeHeader(), buffer]);
    } else {
      return buffer;
    }
  }

  serverIn({ buffer, next, fail }) {
    if (!this._isHeaderRecv) {

      if (this._isConnecting) {
        this._pending = Buffer.concat([this._pending, buffer]);
        return;
      }

      const decoded = this.decodeHeader({ buffer, fail });
      if (!decoded) {
        return;
      }

      const { host, port, data } = decoded;

      // notify to connect to the real server
      this._isConnecting = true;
      this.resolveTargetAddress({ host, port }, () => {
        next(Buffer.concat([data, this._pending]));
        this._isHeaderRecv = true;
        this._isConnecting = false;
        this._pending = null;
      });
    } else {
      return buffer;
    }
  }

  // udp

  clientOutUdp({ buffer }) {
    return Buffer.concat([this.encodeHeader(), buffer]);
  }

  serverInUdp({ buffer, next, fail }) {
    const decoded = this.decodeHeader({ buffer, fail });
    if (!decoded) {
      return;
    }
    const { host, port, data } = decoded;
    this.resolveTargetAddress({ host, port }, () => next(data));
  }

}
