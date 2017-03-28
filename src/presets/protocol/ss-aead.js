import crypto from 'crypto';
import {IPreset} from '../interface';
import {Utils, BYTE_ORDER_LE, AdvancedBuffer} from '../../utils';
import {EVP_BytesToKey} from '../crypto/openssl';

const NONCE_LEN = 12;
const TAG_LEN = 16;
const MIN_CHUNK_LEN = TAG_LEN * 2 + 3;
const MAX_DATA_LEN = 0x3FFF;

// available ciphers
const ciphers = [
  'aes-128-gcm', 'aes-192-gcm', 'aes-256-gcm'
];

const HKDF_HASH_ALGORITHM = 'sha1';

/**
 * divide buffer into size length chunks
 * @param buffer
 * @param size
 * @returns {Array<Buffer>}
 */
function getChunks(buffer, size) {
  const totalLen = buffer.length;
  const bufs = [];
  let ptr = 0;
  while (ptr < totalLen - 1) {
    bufs.push(buffer.slice(ptr, ptr + size));
    ptr += size;
  }
  if (ptr < totalLen) {
    bufs.push(buffer.slice(ptr));
  }
  return bufs;
}

/**
 * calculate the HMAC from key and message
 * @param key
 * @param buffer
 * @returns {Buffer}
 */
function hmac(key, buffer) {
  const hmac = crypto.createHmac(HKDF_HASH_ALGORITHM, key);
  return hmac.update(buffer).digest();
}

/**
 * HMAC-based Extract-and-Expand Key Derivation Function
 * @param salt, a non-secret random value
 * @param ikm, input keying material
 * @param info, optional context and application specific information
 * @param length, length of output keying material in octets
 * @returns {Buffer}
 */
function HKDF(salt, ikm, info, length) {
  // Step 1: "extract" to fixed length pseudo-random key(prk)
  const prk = hmac(salt, ikm);
  // Step 2: "expand" prk to several pseudo-random keys(okm)
  let t = Buffer.alloc(0);
  let okm = Buffer.alloc(0);
  for (let i = 0; i < Math.ceil(length / prk.length); ++i) {
    t = hmac(prk, Buffer.concat([t, info, Buffer.alloc(1, i + 1)]));
    okm = Buffer.concat([okm, t]);
  }
  // Step 3: crop okm to desired length
  return okm.slice(0, length);
}

/**
 * @description
 *   AEAD ciphers simultaneously provide confidentiality, integrity, and authenticity.
 *
 * @params
 *   cipher: The encryption/decryption method.
 *   info: An info for HKDF.
 *
 * @examples
 *   "protocol": "ss-aead"
 *   "protocol_params": "aes-128-gcm,ss-subkey"
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
export default class SSAeadProtocol extends IPreset {

  _cipherName = '';

  _info = null;

  _cipherKey = null;

  _decipherKey = null;

  _cipherNonce = 0;

  _decipherNonce = 0;

  _adBuf = null;

  constructor(cipher, info) {
    super();
    if (typeof cipher === 'undefined' || cipher === '') {
      throw Error('\'protocol_params\' requires [cipher] parameter.');
    }
    if (!ciphers.includes(cipher)) {
      throw Error(`cipher \'${cipher}\' is not supported.`);
    }
    this._cipherName = cipher;
    this._info = Buffer.from(info);
    this._adBuf = new AdvancedBuffer({getPacketLength: this.onReceiving.bind(this)});
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  beforeOut({buffer}) {
    let salt = null;
    if (this._cipherKey === null) {
      const size = this._cipherName.split('-')[1] / 8; // key and salt size
      salt = crypto.randomBytes(size);
      this._cipherKey = HKDF(salt, EVP_BytesToKey(__KEY__, size), this._info, size);
    }
    const chunks = getChunks(buffer, MAX_DATA_LEN).map((chunk) => {
      const dataLen = Utils.numberToUInt(chunk.length);
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
      this._decipherKey = HKDF(salt, EVP_BytesToKey(__KEY__, size), this._info, size);
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
      Utils.numberToUInt(this._cipherNonce, NONCE_LEN, BYTE_ORDER_LE)
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
      Utils.numberToUInt(this._decipherNonce, NONCE_LEN, BYTE_ORDER_LE)
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
