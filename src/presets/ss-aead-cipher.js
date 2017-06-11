import crypto from 'crypto';
import {
  EVP_BytesToKey,
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

// available ciphers
const ciphers = [
  'aes-128-gcm', 'aes-192-gcm', 'aes-256-gcm'
];

const HKDF_HASH_ALGORITHM = 'sha1';

/**
 * @description
 *   AEAD ciphers simultaneously provide confidentiality, integrity, and authenticity.
 *
 * @params
 *   method: The encryption/decryption method.
 *   info: An info for HKDF.
 *
 * @examples
 *  {
 *    "name": "ss-aead-cipher",
 *    "params": {
 *      "method": "aes-128-gcm",
 *      "info": "ss-subkey"
 *    }
 *  }
 *
 * @protocol
 *
 *   # TCP packet
 *   +---------+------------+------------+-----------+
 *   |  SALT   |   chunk_0  |   chunk_1  |    ...    |
 *   +---------+------------+------------+-----------+
 *   |  Fixed  |  Variable  |  Variable  |    ...    |
 *   +---------+------------+------------+-----------+
 *
 *   # TCP chunk
 *   +---------+-------------+----------------+--------------+
 *   | DataLen | DataLen_TAG |      Data      |   Data_TAG   |
 *   +---------+-------------+----------------+--------------+
 *   |    2    |    Fixed    |    Variable    |    Fixed     |
 *   +---------+-------------+----------------+--------------+
 *
 * @explain
 *   1. Salt is randomly generated, and is to derive the per-session subkey in HKDF.
 *   2. Shadowsocks python reuse OpenSSLCrypto which derive original key by EVP_BytesToKey first.
 *   3. DataLen and Data are ciphertext, while TAGs are plaintext.
 *   4. TAGs are automatically generated and verified by Node.js crypto module.
 *   5. len(Data) <= 0x3FFF.
 *   6. The high 2-bit of DataLen must be zero.
 *   7. Nonce is used as IV in encryption/decryption.
 *   8. Nonce is little-endian.
 *   9. Each chunk increases the nonce twice.
 *
 * @reference
 *   [1] HKDF
 *       https://tools.ietf.org/html/rfc5869
 *   [2] AEAD Spec
 *       https://shadowsocks.org/en/spec/AEAD-Ciphers.html
 *   [3] Tags
 *       https://nodejs.org/dist/latest-v6.x/docs/api/crypto.html#crypto_cipher_getauthtag
 *       https://nodejs.org/dist/latest-v6.x/docs/api/crypto.html#crypto_decipher_setauthtag_buffer
 */
export default class SSAeadCipherPreset extends IPreset {

  _cipherName = '';

  _info = null;

  _cipherKey = null;

  _decipherKey = null;

  _cipherNonce = 0;

  _decipherNonce = 0;

  _adBuf = null;

  constructor({method, info}) {
    super();
    if (typeof method === 'undefined' || method === '') {
      throw Error('\'method\' must be set.');
    }
    if (!ciphers.includes(method)) {
      throw Error(`method \'${method}\' is not supported.`);
    }
    this._cipherName = method;
    this._info = Buffer.from(info);
    this._adBuf = new AdvancedBuffer({getPacketLength: this.onReceiving.bind(this)});
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  beforeOut({buffer}) {
    let salt = null;
    if (this._cipherKey === null) {
      const size = this._cipherName.split('-')[1] / 8; // key and salt size
      salt = crypto.randomBytes(size);
      this._cipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, EVP_BytesToKey(__KEY__, size, 16), this._info, size);
    }
    const chunks = getRandomChunks(buffer, MIN_CHUNK_SPLIT_LEN, MAX_CHUNK_SPLIT_LEN).map((chunk) => {
      const dataLen = numberToBuffer(chunk.length);
      const [encLen, lenTag] = this.encrypt(dataLen);
      const [encData, dataTag] = this.encrypt(chunk);
      return Buffer.concat([encLen, lenTag, encData, dataTag]);
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
    if (this._decipherKey === null) {
      const size = this._cipherName.split('-')[1] / 8; // key and salt size
      if (buffer.length < size) {
        return; // too short to get salt
      }
      const salt = buffer.slice(0, size);
      this._decipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, EVP_BytesToKey(__KEY__, size, 16), this._info, size);
      return buffer.slice(size); // drop salt
    }

    if (buffer.length < MIN_CHUNK_LEN) {
      return; // too short to verify DataLen
    }

    // verify DataLen, DataLen_TAG
    const [encLen, lenTag] = [buffer.slice(0, 2), buffer.slice(2, 2 + TAG_LEN)];
    const dataLen = this.decrypt(encLen, lenTag);
    if (dataLen === null) {
      fail(`unexpected DataLen_TAG=${lenTag.toString('hex')} when verify DataLen=${encLen.toString('hex')}`);
      return -1;
    }
    return 2 + TAG_LEN + dataLen.readUInt16BE(0) + TAG_LEN;
  }

  onChunkReceived(chunk, {next, fail}) {
    // verify Data, Data_TAG
    const [encData, dataTag] = [chunk.slice(2 + TAG_LEN, -TAG_LEN), chunk.slice(-TAG_LEN)];
    const data = this.decrypt(encData, dataTag);
    if (data === null) {
      fail(`unexpected Data_TAG=${dataTag.toString('hex')} when verify Data=${encData.slice(0, 60).toString('hex')}`);
      return;
    }
    next(data);
  }

  encrypt(message) {
    const cipher = crypto.createCipheriv(
      this._cipherName,
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
      this._cipherName,
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
