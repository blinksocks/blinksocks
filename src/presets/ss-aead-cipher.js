import crypto from 'crypto';
import {IPreset} from './defs';
import {EVP_BytesToKey, HKDF, getRandomChunks, numberToBuffer, BYTE_ORDER_LE, AdvancedBuffer} from '../utils';

const TAG_SIZE = 16;
const MIN_CHUNK_LEN = TAG_SIZE * 2 + 3;
const MIN_CHUNK_SPLIT_LEN = 0x0800;
const MAX_CHUNK_SPLIT_LEN = 0x3FFF;

// available ciphers and [key size, salt size, nonce size]
const ciphers = {
  'aes-128-gcm': [16, 16, 12],
  'aes-192-gcm': [24, 24, 12],
  'aes-256-gcm': [32, 32, 12],
  'chacha20-poly1305': [32, 32, 8],
  'chacha20-ietf-poly1305': [32, 32, 12],
  'xchacha20-ietf-poly1305': [32, 32, 24]
};

const libsodium_functions = {
  'chacha20-poly1305': [
    'crypto_aead_chacha20poly1305_encrypt_detached',
    'crypto_aead_chacha20poly1305_decrypt_detached'
  ],
  'chacha20-ietf-poly1305': [
    'crypto_aead_chacha20poly1305_ietf_encrypt_detached',
    'crypto_aead_chacha20poly1305_ietf_decrypt_detached'
  ],
  'xchacha20-ietf-poly1305': [
    'crypto_aead_xchacha20poly1305_ietf_encrypt_detached',
    'crypto_aead_xchacha20poly1305_ietf_decrypt_detached'
  ]
};

const HKDF_HASH_ALGORITHM = 'sha1';
const HKDF_INFO = 'ss-subkey';

/**
 * @description
 *   AEAD ciphers simultaneously provide confidentiality, integrity, and authenticity.
 *
 * @params
 *   method: The encryption/decryption method.
 *
 * @examples
 *   {
 *     "name": "ss-aead-cipher",
 *     "params": {
 *       "method": "aes-128-gcm"
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
 *   # TCP chunk_i
 *   +---------+-------------+----------------+--------------+
 *   | DataLen | DataLen_TAG |      Data      |   Data_TAG   |
 *   +---------+-------------+----------------+--------------+
 *   |    2    |    Fixed    |    Variable    |    Fixed     |
 *   +---------+-------------+----------------+--------------+
 *
 *   # UDP packet
 *   +---------+----------------+--------------+
 *   |  SALT   |      Data      |   Data_TAG   |
 *   +---------+----------------+--------------+
 *   |  Fixed  |    Variable    |    Fixed     |
 *   +---------+----------------+--------------+
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
export default class SsAeadCipherPreset extends IPreset {

  static cipherName = '';

  static info = Buffer.from(HKDF_INFO);

  static keySize = 0;

  static saltSize = 0;

  static nonceSize = 0;

  static evpKey = null;

  static isUseLibSodium = false;

  _cipherKey = null;

  _decipherKey = null;

  _cipherNonce = 0;

  _decipherNonce = 0;

  _adBuf = null;

  static checkParams({method}) {
    const cipherNames = Object.keys(ciphers);
    if (!cipherNames.includes(method)) {
      throw Error(`'method' must be one of [${cipherNames}]`);
    }
  }

  static onInit({method}) {
    const [keySize, saltSize, nonceSize] = ciphers[method];
    SsAeadCipherPreset.cipherName = method;
    SsAeadCipherPreset.keySize = keySize;
    SsAeadCipherPreset.saltSize = saltSize;
    SsAeadCipherPreset.nonceSize = nonceSize;
    SsAeadCipherPreset.evpKey = EVP_BytesToKey(__KEY__, keySize, 16);
    SsAeadCipherPreset.isUseLibSodium = Object.keys(libsodium_functions).includes(method);
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
  }

  // tcp

  beforeOut({buffer}) {
    let salt = null;
    if (this._cipherKey === null) {
      const {keySize, saltSize, evpKey, info} = SsAeadCipherPreset;
      salt = crypto.randomBytes(saltSize);
      this._cipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, evpKey, info, keySize);
    }
    const chunks = getRandomChunks(buffer, MIN_CHUNK_SPLIT_LEN, MAX_CHUNK_SPLIT_LEN - 1).map((chunk) => {
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
      const {keySize, saltSize, evpKey, info} = SsAeadCipherPreset;
      if (buffer.length < saltSize) {
        return; // too short to get salt
      }
      const salt = buffer.slice(0, saltSize);
      this._decipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, evpKey, info, keySize);
      return buffer.slice(saltSize); // drop salt
    }

    if (buffer.length < MIN_CHUNK_LEN) {
      return; // too short to verify DataLen
    }

    // verify DataLen, DataLen_TAG
    const [encLen, lenTag] = [buffer.slice(0, 2), buffer.slice(2, 2 + TAG_SIZE)];
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
    return 2 + TAG_SIZE + dataLen + TAG_SIZE;
  }

  onChunkReceived(chunk, {next, fail}) {
    // verify Data, Data_TAG
    const [encData, dataTag] = [chunk.slice(2 + TAG_SIZE, -TAG_SIZE), chunk.slice(-TAG_SIZE)];
    const data = this.decrypt(encData, dataTag);
    if (data === null) {
      return fail(`unexpected Data_TAG=${dataTag.toString('hex')} when verify Data=${encData.slice(0, 60).toString('hex')}, dump=${chunk.slice(0, 60).toString('hex')}`);
    }
    next(data);
  }

  encrypt(message) {
    const {isUseLibSodium, cipherName, nonceSize} = SsAeadCipherPreset;
    const cipherKey = this._cipherKey;
    const nonce = numberToBuffer(this._cipherNonce, nonceSize, BYTE_ORDER_LE);
    let ciphertext = null;
    let tag = null;
    if (isUseLibSodium) {
      const noop = Buffer.alloc(0);
      const result = libsodium[libsodium_functions[cipherName][0]](
        message, noop, noop, nonce, cipherKey
      );
      ciphertext = Buffer.from(result.ciphertext);
      tag = Buffer.from(result.mac);
    } else {
      const cipher = crypto.createCipheriv(cipherName, cipherKey, nonce);
      ciphertext = Buffer.concat([cipher.update(message), cipher.final()]);
      tag = cipher.getAuthTag();
    }
    this._cipherNonce += 1;
    return [ciphertext, tag];
  }

  decrypt(ciphertext, tag) {
    const {isUseLibSodium, cipherName, nonceSize} = SsAeadCipherPreset;
    const decipherKey = this._decipherKey;
    const nonce = numberToBuffer(this._decipherNonce, nonceSize, BYTE_ORDER_LE);
    if (isUseLibSodium) {
      const noop = Buffer.alloc(0);
      try {
        const plaintext = libsodium[libsodium_functions[cipherName][1]](
          noop, ciphertext, tag, noop, nonce, decipherKey
        );
        this._decipherNonce += 1;
        return Buffer.from(plaintext);
      } catch (err) {
        return null;
      }
    } else {
      const decipher = crypto.createDecipheriv(cipherName, decipherKey, nonce);
      decipher.setAuthTag(tag);
      try {
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        this._decipherNonce += 1;
        return plaintext;
      } catch (err) {
        return null;
      }
    }
  }

  // udp

  beforeOutUdp({buffer}) {
    const {keySize, saltSize, evpKey, info} = SsAeadCipherPreset;
    const salt = crypto.randomBytes(saltSize);
    this._cipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, evpKey, info, keySize);
    this._cipherNonce = 0;
    const [ciphertext, tag] = this.encrypt(buffer);
    return Buffer.concat([salt, ciphertext, tag]);
  }

  beforeInUdp({buffer, fail}) {
    const {keySize, saltSize, evpKey, info} = SsAeadCipherPreset;
    if (buffer.length < saltSize) {
      return fail(`too short to get salt, len=${buffer.length} dump=${buffer.toString('hex')}`);
    }
    const salt = buffer.slice(0, saltSize);
    this._decipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, evpKey, info, keySize);
    this._decipherNonce = 0;
    if (buffer.length < saltSize + TAG_SIZE + 1) {
      return fail(`too short to verify Data, len=${buffer.length} dump=${buffer.toString('hex')}`);
    }
    const [encData, dataTag] = [buffer.slice(saltSize, -TAG_SIZE), buffer.slice(-TAG_SIZE)];
    const data = this.decrypt(encData, dataTag);
    if (data === null) {
      return fail(`unexpected Data_TAG=${dataTag.toString('hex')} when verify Data=${encData.slice(0, 60).toString('hex')}, dump=${buffer.slice(0, 60).toString('hex')}`);
    }
    return data;
  }

}
