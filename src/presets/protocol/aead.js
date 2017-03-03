import logger from 'winston';
import {IPreset} from '../interface';
import {Utils, AdvancedBuffer, Crypto} from '../../utils';

const PADDING_LEN = 12;

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
 *   "protocol_params": "aes-128-cbc,sha256"
 *
 * @protocol
 *
 *   # TCP handshake & chunk
 *   +---------------+-----+----------+-------------------+----------+
 *   |    PADDING    | LEN |  HMAC-A  |      PAYLOAD      |  HMAC-B  |
 *   +---------------+-----+----------+-------------------+----------+
 *   |      12       |  4  |  Fixed   |      Variable     |  Fixed   |
 *   +---------------+-----+----------+-------------------+----------+
 *   |<----- header ------>|
 *
 * @explain
 *   1. LEN is the total length of the packet.
 *   2. PADDING is random generated.
 *   3. HMAC-A = mac(encrypt(header)).
 *   4. HMAC-B = mac(encrypt(PAYLOAD)).
 *   5. The length of HMAC depends on message digest algorithm.
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

  clientOut(args) {
    return this._out(args);
  }

  serverIn({buffer, next}) {
    this._fNext = next;
    this._adBuf.put(buffer);
  }

  serverOut(args) {
    return this._out(args);
  }

  clientIn({buffer, next}) {
    this._bNext = next;
    this._adBuf.put(buffer);
  }

  _out({buffer}) {
    const encBuffer = this.encrypt(buffer);
    const encHeader = this.encrypt(Buffer.concat([
      Crypto.randomBytes(PADDING_LEN),
      Utils.toBytesBE(16 + this._hmacLen + encBuffer.length + this._hmacLen, 4)
    ]), false);
    const hmacA = this.createHmac(encHeader);
    const hmacB = this.createHmac(encBuffer);
    const out = Buffer.concat([encHeader, hmacA, encBuffer, hmacB]);
    if (__IS_CLIENT__) {
      logger.info(`ClientOut(${out.length} bytes): ${out.slice(0, 60).toString('hex')}`);
    } else {
      logger.info(`ServerOut(${out.length} bytes): ${out.slice(0, 60).toString('hex')}`);
    }
    return out;
  }

  /**
   * @param buffer
   * @returns {Number}
   */
  onGetLength(buffer) {
    if (buffer.length < (16 + 2 * this._hmacLen)) {
      logger.warn(`dropped unexpected packet (${buffer.length} bytes) received from client: ${buffer.slice(0, 60).toString('hex')}`);
      return -1;
    }
    const encLen = buffer.slice(0, 16);
    const expHmacA = this.createHmac(encLen);
    const hmacA = buffer.slice(16, 16 + this._hmacLen);
    if (!hmacA.equals(expHmacA)) {
      logger.error(`dropped unexpected packet (${buffer.length} bytes) received from server: wrong HMAC-A ${buffer.slice(0, 60).toString('hex')}`);
      return -1;
    }
    // safely decrypt then get length
    return this.decrypt(encLen, false).readUIntBE(PADDING_LEN, 4);
  }

  /**
   * triggered when all chunks received
   * @param packet
   */
  onReceived(packet) {
    if (__IS_CLIENT__) {
      logger.info(`ClientIn(${packet.length} bytes): ${packet.slice(0, 60).toString('hex')}`);
    } else {
      logger.info(`ServerIn(${packet.length} bytes): ${packet.slice(0, 60).toString('hex')}`);
    }
    const _packet = packet.slice(16 + this._hmacLen);
    const hmacB = _packet.slice(-this._hmacLen);
    const expHmacB = this.createHmac(_packet.slice(0, -this._hmacLen));
    if (!hmacB.equals(expHmacB)) {
      logger.error(`dropped unexpected packet (${packet.length} bytes) received from ${__IS_CLIENT__ ? 'server' : 'client'}: wrong HMAC-B ${packet.slice(0, 60).toString('hex')}`);
      // TODO: maybe notify to disconnect rather than timeout?
      return;
    }
    const next = __IS_CLIENT__ ? this._bNext : this._fNext;
    next(this.decrypt(_packet.slice(0, -this._hmacLen)));
  }

  encrypt(buffer, padding = true) {
    const cipher = Crypto.createCipher(this._cipher, this._key);
    cipher.setAutoPadding(padding);
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
  }

  decrypt(buffer, padding = true) {
    const decipher = Crypto.createDecipher(this._cipher, this._key);
    decipher.setAutoPadding(padding);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
  }

  createHmac(buffer) {
    const hmac = Crypto.createHmac(this._hash, this._key);
    hmac.update(buffer);
    return hmac.digest();
  }

}
