"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.randomBytes = randomBytes;
exports.hash = hash;
exports.hmac = hmac;
exports.shake128 = shake128;
exports.fnv1a = fnv1a;
exports.xor = xor;
exports.EVP_BytesToKey = EVP_BytesToKey;
exports.HKDF = HKDF;

var _crypto = _interopRequireDefault(require("crypto"));

var _jsSha = _interopRequireDefault(require("js-sha3"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const RANDOM_BYTES_POOL_SIZE = 1024;

const randomBytesPool = _crypto.default.randomBytes(RANDOM_BYTES_POOL_SIZE);

let randptr = 0;

function _refillRandomBytesPool() {
  randomBytesPool.fill(_crypto.default.randomBytes(RANDOM_BYTES_POOL_SIZE));
  randptr = 0;
}

function randomBytes(len) {
  const start = randptr;
  const end = randptr + len;
  let bytes = null;

  if (end < RANDOM_BYTES_POOL_SIZE) {
    bytes = randomBytesPool.slice(start, end);
    randptr += len;
  } else if (end > RANDOM_BYTES_POOL_SIZE) {
    const extra = _crypto.default.randomBytes(end - RANDOM_BYTES_POOL_SIZE);

    bytes = Buffer.concat([randomBytesPool.slice(start), extra]);

    _refillRandomBytesPool();
  } else {
    bytes = randomBytesPool.slice(start);

    _refillRandomBytesPool();
  }

  return bytes;
}

function hash(algorithm, buffer) {
  const hs = _crypto.default.createHash(algorithm);

  hs.update(buffer);
  return hs.digest();
}

function hmac(algorithm, key, buffer) {
  const hmac = _crypto.default.createHmac(algorithm, key);

  return hmac.update(buffer).digest();
}

function shake128(buffer) {
  let buffered = [];
  let iter = 0;
  return {
    nextBytes: function nextBytes(n) {
      if (iter + n > buffered.length) {
        const hash = _jsSha.default.shake128.create(buffered.length * 8 + 512);

        hash.update(buffer);
        buffered = Buffer.from(hash.arrayBuffer());
      }

      const bytes = buffered.slice(iter, iter + n);
      iter += n;
      return bytes;
    }
  };
}

function fnv1a(buffer) {
  let hash = 0x811c9dc5;

  for (let i = 0; i < buffer.length; ++i) {
    hash ^= buffer[i];
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  const buf = Buffer.alloc(4);
  buf.writeUIntBE(hash >>> 0, 0, 4);
  return buf;
}

function xor(buf1, buf2) {
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

function EVP_BytesToKey(password, keyLen, ivLen) {
  let _data = Buffer.from(password);

  let i = 0;
  const bufs = [];

  while (Buffer.concat(bufs).length < keyLen + ivLen) {
    if (i > 0) {
      _data = Buffer.concat([bufs[i - 1], Buffer.from(password)]);
    }

    bufs.push(hash('md5', _data));
    i += 1;
  }

  return Buffer.concat(bufs).slice(0, keyLen);
}

function HKDF(hash, salt, ikm, info, length) {
  const prk = hmac(hash, salt, ikm);
  let t = Buffer.alloc(0);
  let okm = Buffer.alloc(0);

  for (let i = 0; i < Math.ceil(length / prk.length); ++i) {
    t = hmac(hash, prk, Buffer.concat([t, info, Buffer.alloc(1, i + 1)]));
    okm = Buffer.concat([okm, t]);
  }

  return okm.slice(0, length);
}