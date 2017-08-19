import crypto from 'crypto';
import {EVP_BytesToKey, numberToBuffer, hmac, Xor} from '../utils';
import {IPreset, SOCKET_CONNECT_TO_REMOTE} from './defs';

const IV_LEN = 16;
const HMAC_LEN = 16;

// available ciphers
const ciphers = [
  'aes-128-ctr', 'aes-192-ctr', 'aes-256-ctr',
  'aes-128-cfb', 'aes-192-cfb', 'aes-256-cfb',
  'camellia-128-cfb', 'camellia-192-cfb', 'camellia-256-cfb'
];

/**
 * @description
 *   Delivery destination address(ip/hostname) and port with authorization and stream encryption.
 *
 * @params
 *   no
 *
 * @examples
 *   {
 *     "name": "exp-base-auth-stream",
 *     "params": {
 *       "method": "aes-256-ctr"
 *     }
 *   }
 *
 * @protocol
 *
 *   # Client => Server, TCP stream
 *   +----------+-----------+------+----------+----------+----------+---------+
 *   |    IV    | HMAC-SHA1 | ALEN | DST.ADDR | DST.PORT |   DATA   |   ...   |
 *   +----------+-----------+------+----------+----------+----------+---------+
 *   |    16    |    16     |  1   | Variable |    2     | Variable |   ...   |
 *   +----------+-----------+------+----------+----------+----------+---------+
 *                          |<------------------ encrypted ------------------>|
 *
 *   # After handshake
 *   +----------+
 *   |   DATA   |
 *   +----------+
 *   | Variable |
 *   +----------+
 *
 * @explain
 *   1. HMAC-SHA1 = HMAC(ALEN + DST.ADDR + DST.PORT), key is (IV ^ EVP_BytesToKey(rawKey, keyLen, 16).slice(0, IV_LEN)).
 *   2. ALEN = len(DST.ADDR).
 *   3. Encrypt-then-Mac(EtM) is performed to calculate HMAC-SHA1.
 *   4. The initial stream MUST contain a DATA chunk followed by [ALEN, DST.ADDR, DST.PORT].
 */
export default class ExpBaseAuthStreamPreset extends IPreset {

  _isHandshakeDone = false;

  _isBroadCasting = false;

  _staging = Buffer.alloc(0);

  _host = null; // buffer

  _port = null; // buffer

  _cipherName = '';

  _cipher = null;

  _decipher = null;

  constructor({method}) {
    super();
    if (typeof method !== 'string' || method === '') {
      throw Error('\'method\' must be set');
    }
    if (!ciphers.includes(method)) {
      throw Error(`method '${method}' is not supported.`);
    }
    this._cipherName = method;
  }

  onNotified(action) {
    if (__IS_CLIENT__ && action.type === SOCKET_CONNECT_TO_REMOTE) {
      const {host, port} = action.payload;
      this._host = Buffer.from(host);
      this._port = numberToBuffer(port);
    }
  }

  clientOut({buffer}) {
    if (!this._isHandshakeDone) {
      this._isHandshakeDone = true;

      // prepare
      const iv = crypto.randomBytes(IV_LEN);
      const keyForEncryption = EVP_BytesToKey(__KEY__, this._cipherName.split('-')[1] / 8, IV_LEN);
      const keyForHMAC = Xor(iv, keyForEncryption.slice(0, IV_LEN));

      // initialize cipher/decipher
      this._cipher = crypto.createCipheriv(this._cipherName, keyForEncryption, iv);
      this._decipher = crypto.createDecipheriv(this._cipherName, keyForEncryption, iv);

      const encBuf = this.encrypt(Buffer.concat([numberToBuffer(this._host.length, 1), this._host, this._port, buffer]));
      const hmacEncAddr = hmac('sha1', keyForHMAC, encBuf.slice(0, -buffer.length)).slice(0, HMAC_LEN);

      return Buffer.concat([iv, hmacEncAddr, encBuf]);
    } else {
      return this.encrypt(buffer);
    }
  }

  serverIn({buffer, next, broadcast, fail}) {
    if (!this._isHandshakeDone) {

      if (this._isBroadCasting) {
        this._staging = Buffer.concat([this._staging, buffer]);
        return;
      }

      // minimal length required
      if (buffer.length < 37) {
        return fail(`unexpected buffer length_1: ${buffer.length}, buffer=${buffer.toString('hex')}`);
      }

      // obtain IV and initialize cipher/decipher
      const iv = buffer.slice(0, IV_LEN);
      const keyForEncryption = EVP_BytesToKey(__KEY__, this._cipherName.split('-')[1] / 8, IV_LEN);

      this._cipher = crypto.createCipheriv(this._cipherName, keyForEncryption, iv);
      this._decipher = crypto.createDecipheriv(this._cipherName, keyForEncryption, iv);

      // decrypt tail
      const tailBuffer = this.decrypt(buffer.slice(32));

      // obtain HMAC and ALEN
      const providedHmac = buffer.slice(16, 32);
      const alen = tailBuffer[0];

      // verify length
      if (buffer.length <= 35 + alen) {
        return fail(`unexpected buffer length_2: ${buffer.length}, buffer=${buffer.toString('hex')}`);
      }

      // verify HMAC
      const keyForHMAC = Xor(iv, keyForEncryption.slice(0, IV_LEN));
      const expHmac = hmac('sha1', keyForHMAC, buffer.slice(32, 35 + alen)).slice(0, HMAC_LEN);
      if (!expHmac.equals(providedHmac)) {
        return fail(`unexpected HMAC-SHA1=${providedHmac.toString('hex')} want=${expHmac.toString('hex')}`);
      }

      // obtain addr, port and data
      const addr = tailBuffer.slice(1, alen + 1).toString();
      const port = tailBuffer.slice(alen + 1, alen + 3).readUInt16BE(0);
      const data = tailBuffer.slice(alen + 3);

      // notify to connect to the real server
      this._isBroadCasting = true;
      broadcast({
        type: SOCKET_CONNECT_TO_REMOTE,
        payload: {
          host: addr,
          port: port,
          // once connected
          onConnected: () => {
            next(Buffer.concat([data, this._staging]));
            this._isHandshakeDone = true;
            this._isBroadCasting = false;
            this._staging = null;
          }
        }
      });
    } else {
      return this.decrypt(buffer);
    }
  }

  serverOut({buffer}) {
    return this.encrypt(buffer);
  }

  clientIn({buffer}) {
    return this.decrypt(buffer);
  }

  encrypt(buffer) {
    return this._cipher.update(buffer);
  }

  decrypt(buffer) {
    return this._decipher.update(buffer);
  }

}
