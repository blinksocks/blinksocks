import crypto from 'crypto';
import semver from 'semver';
import { IPreset } from './defs';
import {
  AdvancedBuffer,
  dumpHex,
  EVP_BytesToKey,
  HKDF,
  getRandomChunks,
  numberToBuffer,
  incrementLE,
} from '../utils';

const TAG_SIZE = 16;
const MIN_CHUNK_LEN = TAG_SIZE * 2 + 3;
const MIN_CHUNK_SPLIT_LEN = 0x0800;
const MAX_CHUNK_SPLIT_LEN = 0x3FFF;

// available ciphers and [key size, salt size, nonce size]
const ciphers = {
  // from openssl
  'aes-128-gcm': [16, 16, 12],
  'aes-192-gcm': [24, 24, 12],
  'aes-256-gcm': [32, 32, 12],
  // from openssl, requires Node.js ^10.2.x
  'aes-128-ccm': [16, 16, 12],
  'aes-192-ccm': [24, 24, 12],
  'aes-256-ccm': [32, 32, 12],
  // from libsodium
  'chacha20-poly1305': [32, 32, 8],
  'chacha20-ietf-poly1305': [32, 32, 12],
  'xchacha20-ietf-poly1305': [32, 32, 24],
};

const libsodium_functions = {
  'chacha20-poly1305': [
    'crypto_aead_chacha20poly1305_encrypt_detached',
    'crypto_aead_chacha20poly1305_decrypt_detached',
  ],
  'chacha20-ietf-poly1305': [
    'crypto_aead_chacha20poly1305_ietf_encrypt_detached',
    'crypto_aead_chacha20poly1305_ietf_decrypt_detached',
  ],
  'xchacha20-ietf-poly1305': [
    'crypto_aead_xchacha20poly1305_ietf_encrypt_detached',
    'crypto_aead_xchacha20poly1305_ietf_decrypt_detached',
  ],
};

const DEFAULT_METHOD = 'aes-256-gcm';
const HKDF_HASH_ALGORITHM = 'sha1';
const HKDF_INFO = 'ss-subkey';

let libsodium = null;

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

  _cipherName = '';

  _info = Buffer.from(HKDF_INFO);

  _keySize = 0;
  _saltSize = 0;
  _nonceSize = 0;

  _evpKey = null;

  _isUseLibSodium = false;

  _cipherKey = null;
  _decipherKey = null;

  _cipherNonce = null;
  _decipherNonce = null;

  _adBuf = null;

  static onCheckParams({ method = DEFAULT_METHOD }) {
    const cipherNames = Object.keys(ciphers);
    if (!cipherNames.includes(method)) {
      throw Error(`"method" must be one of ${cipherNames}, but got "${method}"`);
    }
    if (method.endsWith('ccm') && !semver.gte(process.versions.node, '10.2.0')) {
      throw Error('CCM mode requires Node.js >= v10.2.0');
    }
  }

  static async onCache() {
    // libsodium-wrappers need to be loaded asynchronously
    // so we must wait for it ready before run our service.
    // Ref: https://github.com/jedisct1/libsodium.js#usage-as-a-module
    const _sodium = require('libsodium-wrappers');
    await _sodium.ready;
    if (!libsodium) {
      libsodium = _sodium;
    }
  }

  onInit({ method = DEFAULT_METHOD }) {
    const [keySize, saltSize, nonceSize] = ciphers[method];
    this._cipherName = method;
    this._keySize = keySize;
    this._saltSize = saltSize;
    this._nonceSize = nonceSize;
    this._evpKey = EVP_BytesToKey(this._config.key, keySize, 16);
    this._isUseLibSodium = Object.keys(libsodium_functions).includes(method);
    this._adBuf = new AdvancedBuffer({ getPacketLength: this.onReceiving.bind(this) });
    this._adBuf.on('data', this.onChunkReceived.bind(this));
    this._cipherNonce = Buffer.alloc(nonceSize);
    this._decipherNonce = Buffer.alloc(nonceSize);
    // TODO: prefer to use openssl in Node.js v10.
    // if (this._cipherName === 'chacha20-ietf-poly1305' && semver.gte(process.versions.node, '10.0.0')) {
    //   this._cipherName = 'chacha20-poly1305';
    //   this._isUseLibSodium = false;
    // }
  }

  onDestroy() {
    this._adBuf.clear();
    this._adBuf = null;
    this._cipherKey = null;
    this._decipherKey = null;
    this._cipherNonce = null;
    this._decipherNonce = null;
  }

  // tcp

  beforeOut({ buffer }) {
    let salt = null;
    if (this._cipherKey === null) {
      salt = crypto.randomBytes(this._saltSize);
      this._cipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, this._evpKey, this._info, this._keySize);
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

  beforeIn({ buffer, next, fail }) {
    this._adBuf.put(buffer, { next, fail });
  }

  onReceiving(buffer, { fail }) {
    if (this._decipherKey === null) {
      const saltSize = this._saltSize;
      if (buffer.length < saltSize) {
        return; // too short to get salt
      }
      const salt = buffer.slice(0, saltSize);
      this._decipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, this._evpKey, this._info, this._keySize);
      return buffer.slice(saltSize); // drop salt
    }

    if (buffer.length < MIN_CHUNK_LEN) {
      return; // too short to verify DataLen
    }

    // verify DataLen, DataLen_TAG
    const [encLen, lenTag] = [buffer.slice(0, 2), buffer.slice(2, 2 + TAG_SIZE)];
    const dataLenBuf = this.decrypt(encLen, lenTag);
    if (dataLenBuf === null) {
      fail(`unexpected DataLen_TAG=${dumpHex(lenTag)} when verify DataLen=${dumpHex(encLen)}, dump=${dumpHex(buffer)}`);
      return -1;
    }
    const dataLen = dataLenBuf.readUInt16BE(0);
    if (dataLen > MAX_CHUNK_SPLIT_LEN) {
      fail(`invalid DataLen=${dataLen} is over ${MAX_CHUNK_SPLIT_LEN}, dump=${dumpHex(buffer)}`);
      return -1;
    }
    return 2 + TAG_SIZE + dataLen + TAG_SIZE;
  }

  onChunkReceived(chunk, { next, fail }) {
    // verify Data, Data_TAG
    const [encData, dataTag] = [chunk.slice(2 + TAG_SIZE, -TAG_SIZE), chunk.slice(-TAG_SIZE)];
    const data = this.decrypt(encData, dataTag);
    if (data === null) {
      return fail(`unexpected Data_TAG=${dumpHex(dataTag)} when verify Data=${dumpHex(encData)}, dump=${dumpHex(chunk)}`);
    }
    next(data);
  }

  encrypt(message) {
    const cipherName = this._cipherName;
    const cipherKey = this._cipherKey;
    const nonce = this._cipherNonce;
    let ciphertext = null;
    let tag = null;
    if (this._isUseLibSodium) {
      const noop = Buffer.alloc(0);
      // eslint-disable-next-line
      const result = libsodium[libsodium_functions[cipherName][0]](
        message, noop, noop, nonce, cipherKey,
      );
      ciphertext = Buffer.from(result.ciphertext);
      tag = Buffer.from(result.mac);
    } else {
      const cipher = crypto.createCipheriv(cipherName, cipherKey, nonce, {
        authTagLength: TAG_SIZE,
      });
      ciphertext = Buffer.concat([cipher.update(message), cipher.final()]);
      tag = cipher.getAuthTag();
    }
    incrementLE(nonce);
    return [ciphertext, tag];
  }

  decrypt(ciphertext, tag) {
    const cipherName = this._cipherName;
    const decipherKey = this._decipherKey;
    const nonce = this._decipherNonce;
    if (this._isUseLibSodium) {
      const noop = Buffer.alloc(0);
      try {
        // eslint-disable-next-line
        const plaintext = libsodium[libsodium_functions[cipherName][1]](
          noop, ciphertext, tag, noop, nonce, decipherKey,
        );
        incrementLE(nonce);
        return Buffer.from(plaintext);
      } catch (err) {
        return null;
      }
    } else {
      const decipher = crypto.createDecipheriv(cipherName, decipherKey, nonce, {
        authTagLength: TAG_SIZE,
      });
      decipher.setAuthTag(tag);
      try {
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        incrementLE(nonce);
        return plaintext;
      } catch (err) {
        return null;
      }
    }
  }

  // udp

  beforeOutUdp({ buffer }) {
    const salt = crypto.randomBytes(this._saltSize);
    this._cipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, this._evpKey, this._info, this._keySize);
    this._cipherNonce = Buffer.alloc(this._nonceSize);
    const [ciphertext, tag] = this.encrypt(buffer);
    return Buffer.concat([salt, ciphertext, tag]);
  }

  beforeInUdp({ buffer, fail }) {
    const saltSize = this._saltSize;
    if (buffer.length < saltSize) {
      return fail(`too short to get salt, len=${buffer.length} dump=${dumpHex(buffer)}`);
    }
    const salt = buffer.slice(0, saltSize);
    this._decipherKey = HKDF(HKDF_HASH_ALGORITHM, salt, this._evpKey, this._info, this._keySize);
    this._decipherNonce = Buffer.alloc(this._nonceSize);
    if (buffer.length < saltSize + TAG_SIZE + 1) {
      return fail(`too short to verify Data, len=${buffer.length} dump=${dumpHex(buffer)}`);
    }
    const [encData, dataTag] = [buffer.slice(saltSize, -TAG_SIZE), buffer.slice(-TAG_SIZE)];
    const data = this.decrypt(encData, dataTag);
    if (data === null) {
      return fail(`unexpected Data_TAG=${dumpHex(dataTag)} when verify Data=${dumpHex(encData)}, dump=${dumpHex(buffer)}`);
    }
    return data;
  }

}
