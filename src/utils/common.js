import net from 'net';
import crypto from 'crypto';
import ip from 'ip';
import url from 'urijs';

export const ATYP_V4 = 1;
export const ATYP_DOMAIN = 3;
export const ATYP_V6 = 4;

export const BYTE_ORDER_BE = 0;
export const BYTE_ORDER_LE = 1;

/**
 * convert a number to a buffer with specified length in specified byte order
 * @param num
 * @param len
 * @param byteOrder
 * @returns {Buffer}
 */
export function numberToBuffer(num, len = 2, byteOrder = BYTE_ORDER_BE) {
  if (len < 1) {
    throw Error('len must be greater than 0');
  }

  const isOutOfRange = num > parseInt(`0x${'ff'.repeat(len)}`);
  if (isOutOfRange) {
    throw Error(`Number ${num} is too long to store in a '${len}' length buffer`);
  }

  const buf = Buffer.alloc(len);
  if (byteOrder === BYTE_ORDER_BE) {
    buf.writeUIntBE(num, 0, len);
  } else {
    buf.writeUIntLE(num, 0, len);
  }
  return buf;
}

/**
 * convert a http(s) url to an address with type, host and port
 * @param uri
 * @returns {{type: Number, host: Buffer, port: Buffer}}
 */
export function parseURI(uri) {
  let _uri = uri;
  let _port = null;

  if (_uri.startsWith('http://')) {
    _uri = _uri.substr(7);
    _port = 80;
  }

  if (_uri.startsWith('https://')) {
    _uri = _uri.substr(8);
    _port = 443;
  }

  const parts = {};
  url.parseHost(_uri, parts);

  const {hostname, port} = parts;
  const addrType = net.isIP(hostname) ? (net.isIPv4(hostname) ? ATYP_V4 : ATYP_V6) : ATYP_DOMAIN;

  return {
    type: addrType,
    host: net.isIP(hostname) ? ip.toBuffer(hostname) : Buffer.from(hostname),
    port: numberToBuffer(port || _port || 80)
  };
}

/**
 * returns a random integer in [min, max].
 * @param min
 * @param max
 * @returns {Number}
 */
export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.ceil(max);
  return Math.floor(crypto.randomBytes(1)[0] / 0xff * (max - min + 1)) + min;
}

/**
 * split buffer into chunks, each chunk size is picked randomly from [min, max]
 * @param buffer
 * @param min
 * @param max
 * @returns {Array<Buffer>}
 */
export function getRandomChunks(buffer, min, max) {
  const totalLen = buffer.length;
  const bufs = [];
  let ptr = 0;
  while (ptr < totalLen - 1) {
    const offset = getRandomInt(min, max);
    bufs.push(buffer.slice(ptr, ptr + offset));
    ptr += offset;
  }
  if (ptr < totalLen) {
    bufs.push(buffer.slice(ptr));
  }
  return bufs;
}

/**
 * split buffer into chunks, the max chunk size is maxSize
 * @param buffer
 * @param maxSize
 * @returns {Array<Buffer>}
 */
export function getChunks(buffer, maxSize) {
  const totalLen = buffer.length;
  const bufs = [];
  let ptr = 0;
  while (ptr < totalLen - 1) {
    bufs.push(buffer.slice(ptr, ptr + maxSize));
    ptr += maxSize;
  }
  if (ptr < totalLen) {
    bufs.push(buffer.slice(ptr));
  }
  return bufs;
}

/**
 * return UTC timestamp as buffer
 * @returns {Buffer}
 */
export function getUTC() {
  const ts = Math.floor((new Date()).getTime() / 1e3);
  return numberToBuffer(ts, 4, BYTE_ORDER_BE);
}

/**
 * convert string to buffer
 * @param str
 * @returns {Buffer}
 */
export function hexStringToBuffer(str) {
  return Buffer.from(str, 'hex');
}

/**
 * verify hostname
 *
 * @param hostname
 * @returns {boolean}
 *
 * @reference
 *   http://stackoverflow.com/questions/1755144/how-to-validate-domain-name-in-php
 */
export function isValidHostname(hostname) {
  // overall length check
  if (hostname.length < 1 || hostname.length > 253) {
    return false;
  }
  // valid chars check
  if (/^([a-z\d](-*[a-z\d])*)(\.([a-z\d](-*[a-z\d])*))*$/i.test(hostname) === false) {
    return false;
  }
  // length of each label
  if (/^[^.]{1,63}(\.[^.]{1,63})*$/.test(hostname) === false) {
    return false;
  }
  return true;
}

/**
 * whether a port is valid or not
 * @param port
 * @returns {boolean}
 */
export function isValidPort(port) {
  if (typeof port !== 'number') {
    return false;
  }
  if (port < 0 || port > 65535) {
    return false;
  }
  return true;
}

/**
 * md5 message digest
 * @param buffer
 * @returns {*}
 */
export function md5(buffer) {
  const md5 = crypto.createHash('md5');
  md5.update(buffer);
  return md5.digest();
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
    bufs.push(md5(_data));
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
