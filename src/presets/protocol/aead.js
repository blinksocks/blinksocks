import logger from 'winston';
import getChunks from 'lodash.chunk';
import {IPreset} from '../interface';
import {Utils, AdvancedBuffer, Crypto} from '../../utils';

const PADDING_LEN = 14;
const MAX_PAYLOAD_LEN = 65000;

/**
 * @description
 *   This protocol implementation is Authenticated Encryption(AE) which simultaneously
 *   provides confidentiality, integrity, and authenticity assurances on the data.
 *
 * @params
 *   cipher (String): How to encrypt/decrypt the header bytes.
 *   hash (String): A hash method for calculating HMAC.
 *
 * @examples
 *   "protocol": "aead"
 *   "protocol_params": "aes-128-cbc,md5"
 *   "protocol_params": "aes-128-cbc,sha256"
 *   "protocol_params": "aes-192-cbc,md5"
 *
 * @protocol
 *
 *   # TCP handshake & chunk
 *   +-------------------+-----+---------+-------------------+---------+
 *   |      PADDING      | LEN |  HMAC-A |      PAYLOAD      |  HMAC-B |
 *   +-------------------+-----+---------+-------------------+---------+
 *   |        14         |  2  |  Fixed  |      Variable     |  Fixed  |
 *   +-------------------+-----+---------+-------------------+---------+
 *   |<------- header -------->|
 *
 * @explain
 *   1. LEN is total length of the packet.
 *   2. PADDING is random generated.
 *   3. HMAC-A verify (PADDING + LEN) while HMAC-B verify PAYLOAD.
 *   4. The length of HMAC depends on message digest algorithm.
 *   5. The max length of PAYLOAD is 0xffff - len(padding) - 2 - 2 * max(len(HMAC)) = 65391,
 *      so we must split packets which received from applications into smaller packets(<= 65000)
 *      before wrap them with our header.
 *   6. Encrypt-then-MAC (EtM) is performed for calculating HMAC.
 *
 * @reference
 *   [1] Protocol inspired by shadowsocks
 *       https://shadowsocks.org/en/spec/AEAD.html
 *   [2] Encrypt-then-MAC (EtM)
 *       https://en.wikipedia.org/wiki/Authenticated_encryption#Encrypt-then-MAC_.28EtM.29
 */
export default class AeadProtocol extends IPreset {

  _hmacLen = 0;

  _isHandshakeDone = false;

  _cipher = '';

  _hash = '';

  _key = null;

  _adBuf = null;

  _fNext = null;

  _bNext = null;

  constructor(cipher, hash) {
    super();
    if (typeof cipher === 'undefined' || cipher === '') {
      throw Error('\'protocol_params\' requires [cipher] parameter.');
    }
    if (!Crypto.isCipherAvailable(cipher)) {
      throw Error(`cipher \'${cipher}\' is not supported, use --ciphers to display all supported ciphers`);
    }
    if (typeof hash === 'undefined' || hash === '') {
      throw Error('\'protocol_params\' requires [hash] parameter.');
    }
    if (!Crypto.isHashAvailable(hash)) {
      throw Error(`hash \'${hash}\' is not supported, use --hashes to display all supported hashes`);
    }
    this._cipher = cipher;
    this._hash = hash;
    this._key = Crypto.getStrongKey(cipher, __KEY__);
    this._adBuf = new AdvancedBuffer({getPacketLength: this.onGetLength.bind(this)});
    this._adBuf.on('data', (data) => this.onReceived(data));
    this._hmacLen = Crypto.getHmacLength(this._hash);
  }

  beforeOut({buffer, next}) {
    if (buffer.length > MAX_PAYLOAD_LEN) {
      const chunks = getChunks(buffer, MAX_PAYLOAD_LEN);
      for (const chunk of chunks) {
        next(Buffer.from(chunk));
      }
    } else {
      return buffer;
    }
  }

  clientOut({buffer}) {
    let out;
    if (!this.isHandshakeDone) {
      this._isHandshakeDone = true;
      const header = this.encrypt(Buffer.concat([
        Crypto.randomBytes(PADDING_LEN),
        Utils.toBytesBE(16 + this._hmacLen + buffer.length + this._hmacLen),
      ]));
      const hmacA = this.createHmac(header);
      const hmacB = this.createHmac(buffer);
      out = Buffer.concat([header, hmacA, buffer, hmacB]);
    } else {
      const header = this.encrypt(Buffer.concat([
        Crypto.randomBytes(PADDING_LEN),
        Utils.toBytesBE(16 + this._hmacLen + buffer.length + this._hmacLen)
      ]));
      const hmacA = this.createHmac(header);
      const hmacB = this.createHmac(buffer);
      out = Buffer.concat([header, hmacA, buffer, hmacB]);
    }
    logger.info(`ClientOut(${out.length} bytes): ${out.toString('hex').substr(0, 60)}`);
    return out;
  }

  serverIn({buffer, next}) {
    this._fNext = next;
    this._adBuf.put(buffer);
  }

  serverOut({buffer}) {
    const header = this.encrypt(Buffer.concat([
      Crypto.randomBytes(PADDING_LEN),
      Utils.toBytesBE(16 + this._hmacLen + buffer.length + this._hmacLen)
    ]));
    const hmacA = this.createHmac(header);
    const hmacB = this.createHmac(buffer);
    const out = Buffer.concat([header, hmacA, buffer, hmacB]);
    logger.info(`ServerOut(${out.length} bytes): ${out.toString('hex').substr(0, 60)}`);
    return out;
  }

  clientIn({buffer, next}) {
    this._bNext = next;
    this._adBuf.put(buffer);
  }

  /**
   * @param buffer
   * @returns {Number}
   */
  onGetLength(buffer) {
    if (buffer.length < 16) {
      logger.warn(`dropped unexpected packet (${buffer.length} bytes) received from client`);
      return -1;
    }
    if (!this._isHandshakeDone) {
      this._isHandshakeDone = true;
      // server handshake
      const index = 16;
      const expHmacA = this.createHmac(buffer.slice(0, index));
      const hmacA = buffer.slice(index, index + this._hmacLen);
      if (!hmacA.equals(expHmacA)) {
        throw Error(`dropped unexpected packet (${buffer.length} bytes) received from client: wrong HMAC-A`);
      }
      // safely decrypt
      const decrypted = this.decrypt(buffer.slice(0, index));
      // LEN
      return decrypted.readUInt16BE(PADDING_LEN);
    } else {
      const encLen = buffer.slice(0, 16);
      const expHmacA = this.createHmac(encLen);
      const hmacA = buffer.slice(16, 16 + this._hmacLen);
      if (!hmacA.equals(expHmacA)) {
        throw Error(`dropped unexpected packet (${buffer.length} bytes) received from server: wrong HMAC-A`);
      }
      // safely decrypt then get length
      return this.decrypt(encLen).readUInt16BE(PADDING_LEN);
    }
  }

  /**
   * triggered when all chunks received
   * @param packet
   */
  onReceived(packet) {
    if (__IS_CLIENT__) {
      logger.info(`ClientIn(${packet.length} bytes): ${packet.toString('hex').substr(0, 60)}`);
    } else {
      logger.info(`ServerIn(${packet.length} bytes): ${packet.toString('hex').substr(0, 60)}`);
    }
    const _packet = packet.slice(16 + this._hmacLen);
    const hmacB = _packet.slice(-this._hmacLen);
    const expHmacB = this.createHmac(_packet.slice(0, -this._hmacLen));
    if (!hmacB.equals(expHmacB)) {
      throw Error(`dropped unexpected packet (${packet.length} bytes) received from ${__IS_CLIENT__ ? 'server' : 'client'}: wrong HMAC-B`);
    }
    const next = __IS_CLIENT__ ? this._bNext : this._fNext;
    next(_packet.slice(0, -this._hmacLen));
  }

  encrypt(buffer) {
    const cipher = Crypto.createCipher(this._cipher, this._key);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
  }

  decrypt(buffer) {
    const decipher = Crypto.createDecipher(this._cipher, this._key);
    decipher.setAutoPadding(false);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
  }

  createHmac(buffer) {
    const hmac = Crypto.createHmac(this._hash, this._key);
    hmac.update(buffer);
    return hmac.digest();
  }

}
