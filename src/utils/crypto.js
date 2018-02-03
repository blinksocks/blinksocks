import crypto from 'crypto';
import sha3 from 'js-sha3';

const RANDOM_BYTES_POOL_SIZE = 1024;
const randomBytesPool = crypto.randomBytes(RANDOM_BYTES_POOL_SIZE);

let randptr = 0;

function _refillRandomBytesPool() {
  randomBytesPool.fill(crypto.randomBytes(RANDOM_BYTES_POOL_SIZE));
  randptr = 0;
}

/**
 * fast random bytes generator
 * @param len
 * @returns {Buffer}
 */
export function randomBytes(len) {
  const start = randptr;
  const end = randptr + len;
  let bytes = null;
  if (end < RANDOM_BYTES_POOL_SIZE) {
    bytes = randomBytesPool.slice(start, end);
    randptr += len;
  } else if (end > RANDOM_BYTES_POOL_SIZE) {
    const extra = crypto.randomBytes(end - RANDOM_BYTES_POOL_SIZE);
    bytes = Buffer.concat([randomBytesPool.slice(start), extra]);
    _refillRandomBytesPool();
  } else {
    bytes = randomBytesPool.slice(start);
    _refillRandomBytesPool();
  }
  return bytes;
}

/**
 * message digest
 * @param algorithm
 * @param buffer
 * @returns {*}
 */
export function hash(algorithm, buffer) {
  const hs = crypto.createHash(algorithm);
  hs.update(buffer);
  return hs.digest();
}

/**
 * calculate the HMAC from key and message
 * @param algorithm
 * @param key
 * @param buffer
 * @returns {Buffer}
 */
export function hmac(algorithm, key, buffer) {
  const hmac = crypto.createHmac(algorithm, key);
  return hmac.update(buffer).digest();
}

/**
 * sha3 shake128
 * @param buffer
 * @returns {{nextBytes: nextBytes}}
 */
export function shake128(buffer) {
  let buffered = [];
  let iter = 0;
  return {
    nextBytes: function nextBytes(n) {
      if (iter + n > buffered.length) {
        const hash = sha3.shake128.create(buffered.length * 8 + 512);
        hash.update(buffer);
        buffered = Buffer.from(hash.arrayBuffer());
      }
      const bytes = buffered.slice(iter, iter + n);
      iter += n;
      return bytes;
    }
  };
}

/**
 * Fowler–Noll–Vo hash function
 * @param buffer
 * @returns {Buffer}
 * @reference https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function
 */
export function fnv1a(buffer) {
  let hash = 0x811c9dc5; // offset_basis
  for (let i = 0; i < buffer.length; ++i) {
    hash ^= buffer[i];
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const buf = Buffer.alloc(4);
  buf.writeUIntBE(hash >>> 0, 0, 4);
  return buf;
}

/**
 * xor two Buffer/Array
 * @param buf1
 * @param buf2
 * @returns {*}
 */
export function xor(buf1, buf2) {
  if (buf1.length === buf2.length) {
    const outBuf = [];
    for (let i = 0; i < buf1.length; ++i) {
      outBuf[i] = buf1[i] ^ buf2[i];
    }
    if (buf1 instanceof Buffer) {
      return Buffer.from(outBuf);
    } else {
      return outBuf;
    }
  }
  return null;
}

// key derivation methods

/**
 * EVP_BytesToKey with the digest algorithm set to MD5, one iteration, and no salt
 *
 * @algorithm
 *   D_i = HASH^count(D_(i-1) || data || salt)
 */
export function EVP_BytesToKey(password, keyLen, ivLen) {
  let _data = Buffer.from(password);
  let i = 0;
  const bufs = [];
  while (Buffer.concat(bufs).length < (keyLen + ivLen)) {
    if (i > 0) {
      _data = Buffer.concat([bufs[i - 1], Buffer.from(password)]);
    }
    bufs.push(hash('md5', _data));
    i += 1;
  }
  return Buffer.concat(bufs).slice(0, keyLen);
}

/**
 * HMAC-based Extract-and-Expand Key Derivation Function
 * @param hash, the message digest algorithm
 * @param salt, a non-secret random value
 * @param ikm, input keying material
 * @param info, optional context and application specific information
 * @param length, length of output keying material in octets
 * @returns {Buffer}
 */
export function HKDF(hash, salt, ikm, info, length) {
  // Step 1: "extract" to fixed length pseudo-random key(prk)
  const prk = hmac(hash, salt, ikm);
  // Step 2: "expand" prk to several pseudo-random keys(okm)
  let t = Buffer.alloc(0);
  let okm = Buffer.alloc(0);
  for (let i = 0; i < Math.ceil(length / prk.length); ++i) {
    t = hmac(hash, prk, Buffer.concat([t, info, Buffer.alloc(1, i + 1)]));
    okm = Buffer.concat([okm, t]);
  }
  // Step 3: crop okm to desired length
  return okm.slice(0, length);
}
