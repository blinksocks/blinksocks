import crypto from 'crypto';
import logger from 'winston';
import {IPreset} from '../interface';
import {Utils, AdvancedBuffer} from '../../utils';

const PADDING_LEN = 12;
const HASH_SALT = 'blinksocks';

// available ciphers
const ciphers = [
  'aes-128-ctr', 'aes-192-ctr', 'aes-256-ctr',
  'aes-128-cfb', 'aes-192-cfb', 'aes-256-cfb',
  'aes-128-ofb', 'aes-192-ofb', 'aes-256-ofb',
  'aes-128-cbc', 'aes-192-cbc', 'aes-256-cbc'
];

// available hash functions
const hashes = ['sha1', 'sha256', 'sha512'];

// map hashes to hmac lengths
const hmacLens = {'sha1': 20, 'sha256': 32, 'sha512': 64};

/**
 * generate strong and valid key
 * @param cipher
 * @param key
 * @returns {Buffer}
 */
function getStrongKey(cipher, key) {
  const hash = crypto.createHash('sha256');
  const keyLen = cipher.split('-')[1] / 8;
  hash.update(Buffer.concat([Buffer.from(key), Buffer.from(HASH_SALT)]));
  return hash.digest().slice(0, keyLen);
}

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
    if (!ciphers.includes(cipher)) {
      throw Error(`cipher \'${cipher}\' is not supported.`);
    }
    if (typeof hash === 'undefined' || hash === '') {
      throw Error('\'protocol_params\' requires [hash] parameter.');
    }
    if (!hashes.includes(hash)) {
      throw Error(`hash \'${hash}\' is not supported.`);
    }
    this._cipher = cipher;
    this._hash = hash;
    this._key = getStrongKey(cipher, __KEY__);
    this._adBuf = new AdvancedBuffer({getPacketLength: this.onGetLength.bind(this)});
    this._adBuf.on('data', (data) => this.onReceived(data));
    this._hmacLen = hmacLens[this._hash];
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
      crypto.randomBytes(PADDING_LEN),
      Utils.numberToUIntBE(16 + this._hmacLen + encBuffer.length + this._hmacLen, 4)
    ]), false);
    const hmacA = this.createHmac(encHeader);
    const hmacB = this.createHmac(encBuffer);
    const out = Buffer.concat([encHeader, hmacA, encBuffer, hmacB]);
    if (__IS_CLIENT__) {
      logger.verbose(`ClientOut(LEN=${out.length}): ${out.slice(0, 60).toString('hex')}`);
    } else {
      logger.verbose(`ServerOut(LEN=${out.length}): ${out.slice(0, 60).toString('hex')}`);
    }
    return out;
  }

  /**
   * @param buffer
   * @returns {Number}
   */
  onGetLength(buffer) {
    if (buffer.length < (16 + 2 * this._hmacLen)) {
      return 0; // too short, should continue to receive
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
      logger.verbose(`ClientIn(LEN=${packet.length}): ${packet.slice(0, 60).toString('hex')}`);
    } else {
      logger.verbose(`ServerIn(LEN=${packet.length}): ${packet.slice(0, 60).toString('hex')}`);
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
    const cipher = crypto.createCipher(this._cipher, this._key);
    cipher.setAutoPadding(padding);
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
  }

  decrypt(buffer, padding = true) {
    const decipher = crypto.createDecipher(this._cipher, this._key);
    decipher.setAutoPadding(padding);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
  }

  createHmac(buffer) {
    const hmac = crypto.createHmac(this._hash, this._key);
    hmac.update(buffer);
    return hmac.digest();
  }

}
