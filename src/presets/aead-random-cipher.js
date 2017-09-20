import crypto from 'crypto';
import {
  HKDF,
  getRandomChunks,
  numberToBuffer,
  BYTE_ORDER_LE,
  AdvancedBuffer
} from '../utils';
import {IPreset} from './defs';

const NONCE_LEN = 12;
const TAG_LEN = 16;
const MIN_CHUNK_LEN = TAG_LEN * 2 + 3;
const MIN_CHUNK_SPLIT_LEN = 0x0800;
const MAX_CHUNK_SPLIT_LEN = 0x3FFF;
const DEFAULT_INFO = 'bs-subkey';
const DEFAULT_FACTOR = 2;

// available ciphers
const ciphers = {
  'aes-128-gcm': 16,
  'aes-192-gcm': 24,
  'aes-256-gcm': 32
};

const HKDF_HASH_ALGORITHM = 'sha1';

/**
 * @description
 *   An advanced aead cipher based on ss-aead-cipher, with random padding.
 *
 * @params
 *   method: The encryption/decryption method.
 *   info(optional): An info for HKDF.
 *   factor(optional): Expand random padding length(0-255) by factor times. It must be in [1, 10]. Default is 2.
 *
 * @examples
 *   {
 *     "name": "aead-random-cipher",
 *     "params": {
 *       "method": "aes-128-gcm",
 *       "info": "bs-subkey",
 *       "factor": 2
 *     }
 *   }
 *
 * @protocol
 *
 *   # TCP stream
 *   +---------+------------+------------+-----------+
 *   |  SALT   |   chunk_0  |   chunk_1  |    ...    |
 *   +---------+------------+------------+-----------+
 *   |  Fixed  |  Variable  |  Variable  |    ...    |
 *   +---------+------------+------------+-----------+
 *
 *   # TCP chunk
 *   +----------------+---------+-------------+----------------+--------------+
 *   | Random Padding | DataLen | DataLen_TAG |      Data      |   Data_TAG   |
 *   +----------------+---------+-------------+----------------+--------------+
 *   |    Variable    |    2    |    Fixed    |    Variable    |    Fixed     |
 *   +----------------+---------+-------------+----------------+--------------+
 *
 * @explain
 *   1. Salt is randomly generated, and is to derive the per-session subkey in HKDF.
 *   2. DataLen and Data are ciphertext, while TAGs are plaintext.
 *   3. TAGs are automatically generated and verified by Node.js crypto module.
 *   4. len(Data) <= 0x3FFF.
 *   5. The high 2-bit of DataLen must be zero.
 *   6. Nonce is used as IV in encryption/decryption.
 *   7. Nonce is little-endian.
 *   8. Each chunk increases the nonce twice.
 *   9. len(Random Padding) = encrypt(key, nonce).tag[0] * factor.
 *   10. factor is used for expanding length of padding.
 */
export default class AeadRandomCipherPreset extends IPreset {

  static cipherName = '';

  static info = null;

  static factor = DEFAULT_FACTOR;

  static rawKey = null;

  static keySaltSize = 0; // key and salt size

  _cipherKey = null;

  _decipherKey = null;

  _cipherNonce = 0;

  _decipherNonce = 0;

  // sorry for bad naming,
  // this is used for determining if the current chunk had dropped random padding.
  // please check out onReceiving()
  _nextExpectDecipherNonce = 0;

  _adBuf = null;

  static checkParams({method, info = DEFAULT_INFO, factor = DEFAULT_FACTOR}) {
    if (method === undefined || method === '') {
      throw Error('\'method\' must be set');
    }
    const cipherNames = Object.keys(ciphers);
    if (!cipherNames.includes(method)) {
      throw Error(`'method' must be one of [${cipherNames}]`);
    }
    if (typeof info !== 'string' || info.length <= 0) {
      throw Error('\'info\' must be a non-empty string');
    }
    if (!Number.isInteger(factor)) {
      throw Error('\'factor\' must be an integer');
    }
    if (factor < 1 || factor > 10) {
      throw Error('\'factor\' must be in [1, 10]');
    }
  }

  static onInit({method, info = DEFAULT_INFO, factor = DEFAULT_FACTOR}) {
    AeadRandomCipherPreset.cipherName = method;
    AeadRandomCipherPreset.info = Buffer.from(info);
    AeadRandomCipherPreset.factor = factor;
    AeadRandomCipherPreset.rawKey = Buffer.from(__KEY__);
    AeadRandomCipherPreset.keySaltSize = ciphers[method];
  }

  constructor() {
    super();
    this._adBuf = new AdvancedBuffer({getPacketLength: this.onReceiving.bind(this)});
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onDestroy() {
    this._adBuf.clear();
    this._adBuf = null;
    this._cipherKey = null;
    this._decipherKey = null;
    this._cipherNonce = 0;
    this._decipherNonce = 0;
    this._nextExpectDecipherNonce = 0;
  }

  beforeOut({buffer}) {
    let salt = null;
    if (this._cipherKey === null) {
      const size = AeadRandomCipherPreset.keySaltSize;
      salt = crypto.randomBytes(size);
      this._cipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, AeadRandomCipherPreset.rawKey, AeadRandomCipherPreset.info, size);
    }
    const chunks = getRandomChunks(buffer, MIN_CHUNK_SPLIT_LEN, MAX_CHUNK_SPLIT_LEN).map((chunk) => {
      // random padding
      const paddingLen = this.getPaddingLength(this._cipherKey, this._cipherNonce);
      const padding = crypto.randomBytes(paddingLen);
      // encLen, lenTag
      const dataLen = numberToBuffer(chunk.length);
      const [encLen, lenTag] = this.encrypt(dataLen);
      // encData, dataTag
      const [encData, dataTag] = this.encrypt(chunk);
      return Buffer.concat([padding, encLen, lenTag, encData, dataTag]);
    });
    if (salt) {
      return Buffer.concat([salt, ...chunks]);
    } else {
      return Buffer.concat(chunks);
    }
  }

  beforeIn({buffer, next, fail}) {
    this._adBuf.put(buffer, {next, fail});
  }

  onReceiving(buffer, {fail}) {
    // 1. init this._decipherKey
    if (this._decipherKey === null) {
      const size = AeadRandomCipherPreset.keySaltSize;
      if (buffer.length < size) {
        return; // too short to get salt
      }
      const salt = buffer.slice(0, size);
      this._decipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, AeadRandomCipherPreset.rawKey, AeadRandomCipherPreset.info, size);
      return buffer.slice(size); // drop salt
    }

    // 2. determine padding length then drop it
    if (this._decipherNonce === this._nextExpectDecipherNonce) {
      const paddingLen = this.getPaddingLength(this._decipherKey, this._decipherNonce);
      if (buffer.length < paddingLen) {
        return; // too short to drop padding
      }
      this._nextExpectDecipherNonce += 2; // because each chunk increases the nonce twice
      return buffer.slice(paddingLen); // drop random padding
    }

    if (buffer.length < MIN_CHUNK_LEN) {
      return; // too short to verify DataLen
    }

    // 3. verify DataLen, DataLen_TAG
    const [encLen, lenTag] = [buffer.slice(0, 2), buffer.slice(2, 2 + TAG_LEN)];
    const dataLenBuf = this.decrypt(encLen, lenTag);
    if (dataLenBuf === null) {
      fail(`unexpected DataLen_TAG=${lenTag.toString('hex')} when verify DataLen=${encLen.toString('hex')}, dump=${buffer.slice(0, 60).toString('hex')}`);
      return -1;
    }
    const dataLen = dataLenBuf.readUInt16BE(0);
    if (dataLen > MAX_CHUNK_SPLIT_LEN) {
      fail(`invalid DataLen=${dataLen} is over ${MAX_CHUNK_SPLIT_LEN}, dump=${buffer.slice(0, 60).toString('hex')}`);
      return -1;
    }
    return 2 + TAG_LEN + dataLen + TAG_LEN;
  }

  onChunkReceived(chunk, {next, fail}) {
    // verify Data, Data_TAG
    const [encData, dataTag] = [chunk.slice(2 + TAG_LEN, -TAG_LEN), chunk.slice(-TAG_LEN)];
    const data = this.decrypt(encData, dataTag);
    if (data === null) {
      fail(`unexpected Data_TAG=${dataTag.toString('hex')} when verify Data=${encData.slice(0, 60).toString('hex')}, dump=${chunk.slice(0, 60).toString('hex')}`);
      return;
    }
    next(data);
  }

  getPaddingLength(key, nonce) {
    const nonceBuffer = numberToBuffer(nonce, NONCE_LEN, BYTE_ORDER_LE);
    const cipher = crypto.createCipheriv(AeadRandomCipherPreset.cipherName, key, nonceBuffer);
    cipher.update(nonceBuffer);
    cipher.final();
    return cipher.getAuthTag()[0] * AeadRandomCipherPreset.factor;
  }

  encrypt(message) {
    const cipher = crypto.createCipheriv(
      AeadRandomCipherPreset.cipherName,
      this._cipherKey,
      numberToBuffer(this._cipherNonce, NONCE_LEN, BYTE_ORDER_LE)
    );
    const encrypted = Buffer.concat([cipher.update(message), cipher.final()]);
    const tag = cipher.getAuthTag();
    this._cipherNonce += 1;
    return [encrypted, tag];
  }

  decrypt(ciphertext, tag) {
    const decipher = crypto.createDecipheriv(
      AeadRandomCipherPreset.cipherName,
      this._decipherKey,
      numberToBuffer(this._decipherNonce, NONCE_LEN, BYTE_ORDER_LE)
    );
    decipher.setAuthTag(tag);
    try {
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      this._decipherNonce += 1;
      return decrypted;
    } catch (err) {
      return null;
    }
  }

}
