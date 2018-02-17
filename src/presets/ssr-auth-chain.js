import crypto from 'crypto';
import Long from 'long';
import { IPreset } from './defs';
import {
  hmac,
  xor,
  EVP_BytesToKey,
  dumpHex,
  getChunks,
  getRandomInt,
  getCurrentTimestampInt,
  numberToBuffer as ntb, BYTE_ORDER_LE,
  AdvancedBuffer,
} from '../utils';

const DEFAULT_SALT = 'auth_chain_a';
const MAX_TIME_DIFF = 30; // seconds
const NOOP = Buffer.alloc(0);

/**
 * seedable random number generator implement in pure js
 * @returns {{next: next, init: init}}
 */
export function xorshift128plus() {
  const max_int = Long.fromString('18446744073709551615', true);
  const mov_mask = Long.fromString('2199023255551', true);
  let v0 = 0;
  let v1 = 0;
  return {
    next: function next() {
      let x = v0;
      const y = v1;
      v0 = y;
      x = x.xor(x.and(mov_mask).shiftLeft(23));
      x = x.xor(y.xor(x.shiftRightUnsigned(17)).xor(y.shiftRightUnsigned(26)).and(max_int));
      v1 = x;
      return x.add(y).and(max_int);
    },
    init_from_bin: function init(bin) {
      const buf = Buffer.concat([bin, Buffer.alloc(16)]);
      v0 = Long.fromBits(buf.readUInt32LE(0), buf.readUInt32LE(4), true);
      v1 = Long.fromBits(buf.readUInt32LE(8), buf.readUInt32LE(12), true);
    },
    init_from_bin_datalen: function init_from_bin_datalen(bin, datalen) {
      let buf = Buffer.concat([bin, Buffer.alloc(16)]);
      buf = Buffer.concat([ntb(datalen, 2, BYTE_ORDER_LE), buf.slice(2)]);
      v0 = Long.fromBits(buf.readUInt32LE(0), buf.readUInt32LE(4), true);
      v1 = Long.fromBits(buf.readUInt32LE(8), buf.readUInt32LE(12), true);
      [0, 0, 0, 0].forEach(() => void this.next());
    }
  };
}

/**
 * @description
 *   shadowsocksr "auth_chain_xxx" implementation.
 *
 * @protocol
 *
 *   # TCP handshake request (client -> server)
 *   +--------+--------+
 *   | part 1 | part 2 |
 *   +--------+--------+
 *   |   12   |   24   |
 *   +--------+--------+
 *
 *   part 1
 *   +--------+----------+
 *   | Random | HMAC-MD5 |
 *   +--------+----------+
 *   |    4   |     8    |
 *   +--------+----------+
 *
 *   part 2
 *   +-----+----------------------------+----------+
 *   | UID | AES-128-CBC encrypted data | HMAC-MD5 |
 *   +-----+----------------------------+----------+
 *   |  4  |             16             |     4    |
 *   +-----+----------------------------+----------+
 *
 *   AES-128-CBC encrypted data
 *   +-----+-----+---------------+----------+---------+
 *   | UTC | CID | Connection ID | overhead | reserve |
 *   +-----+---------------------+----------+---------+
 *   |  4  |  4  |       4       |     2    |    2    |
 *   +-----+-----+---------------+----------+---------+
 *
 *   # TCP chunks
 *   +------+--------------+---------+--------------+----------+
 *   | size | Random bytes | Payload | Random bytes | HMAC-MD5 |
 *   +------+--------------+---------+--------------+----------+
 *   |  2   |   Variable   |   size  |   Variable   |     2    |
 *   +------+--------------+---------+--------------+----------+
 *
 *   # UDP (client -> server)
 *   +---------+--------------+--------+-----+----------+
 *   | Payload | Random bytes | Random | UID | HMAC-MD5 |
 *   +---------+--------------+--------+-----+----------+
 *   |Variable |   Variable   |    3   |  4  |     1    |
 *   +---------+--------------+--------+-----+----------+
 *
 *   # UDP (server -> client)
 *   +---------+--------------+--------+----------+
 *   | Payload | Random bytes | Random | HMAC-MD5 |
 *   +---------+--------------+--------+----------+
 *   |Variable |   Variable   |    7   |     1    |
 *   +---------+--------------+--------+----------+
 *
 * @reference
 *   https://github.com/shadowsocksr-rm/shadowsocks-rss/blob/master/doc/auth_chain_a.md
 */
export default class SsrAuthChainPreset extends IPreset {

  _clientId = null;

  _connectionId = null;

  _userKey = null;

  _salt = DEFAULT_SALT; // overwrite by subclass

  _isHeaderSent = false;
  _isHeaderRecv = false;

  // chaining hash
  _lastClientHash = null;
  _lastServerHash = null;

  // xorshift128plus pseudo-random number generator
  _rngClient = null;
  _rngServer = null;

  // chunk counters
  _encodeChunkId = 1;
  _decodeChunkId = 1;

  // chunk payload cipher/decipher
  _cipher = null;
  _decipher = null;

  _tcpMss = 1460;
  _overhead = 4;

  _adBuf = null;

  onInit() {
    this._clientId = crypto.randomBytes(4);
    this._connectionId = getRandomInt(0, 0x00ffffff);
    this._rngClient = xorshift128plus();
    this._rngServer = xorshift128plus();
    this._adBuf = new AdvancedBuffer({ getPacketLength: this.onReceiving.bind(this) });
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onDestroy() {
    this._userKey = null;
    this._lastClientHash = null;
    this._lastServerHash = null;
    this._rngClient = null;
    this._rngServer = null;
    this._cipher = null;
    this._decipher = null;
    this._adBuf.clear();
    this._adBuf = null;
  }

  // implement in subclasses
  getRandomBytesLengthForTcp(/* seed, base, rng */) {
    return 0;
  }

  getRandomBytesLengthForUdp(seed, rng) {
    rng.init_from_bin(seed);
    return rng.next().mod(127).toNumber();
  }

  createRequest() {
    const clientId = this._clientId;
    const connectionId = this._connectionId;

    const userKey = this._userKey = this.readProperty('ss-stream-cipher', 'key');
    const iv = this.readProperty('ss-stream-cipher', 'iv');
    const part1_hmac_key = Buffer.concat([iv, userKey]);

    // part 1
    const random = crypto.randomBytes(4);
    this._lastClientHash = hmac('md5', part1_hmac_key, random);
    const random_hmac = this._lastClientHash.slice(0, 8);
    const part1 = Buffer.concat([random, random_hmac]);

    // part 2
    const uid = xor(crypto.randomBytes(4), this._lastClientHash.slice(8, 12));

    // prepare input data for part2 encryption
    const utc = ntb(getCurrentTimestampInt(), 4, BYTE_ORDER_LE);

    let client_id = clientId;
    let connection_id = connectionId;

    if (connectionId > 0xff000000) {
      connection_id = getRandomInt(0, 0x00ffffff);
      client_id = crypto.randomBytes(4);
      this._connectionId = connection_id;
    } else {
      connection_id = ++this._connectionId;
    }

    const overhead = ntb(this._overhead, 2, BYTE_ORDER_LE);
    const reserve = Buffer.alloc(2);
    const header = Buffer.concat([utc, client_id, ntb(connection_id, 4, BYTE_ORDER_LE), overhead, reserve]);

    // prepare cipher for part 2 encryption
    const cipher_key = EVP_BytesToKey(userKey.toString('base64') + this._salt, 16, 16);
    const cipher = crypto.createCipheriv('aes-128-cbc', cipher_key, Buffer.alloc(16));
    const cbc_enc_header = cipher.update(header);

    let part2 = Buffer.concat([uid, cbc_enc_header]);
    this._lastServerHash = hmac('md5', userKey, part2);
    const part2_hmac = this._lastServerHash.slice(0, 4);
    part2 = Buffer.concat([part2, part2_hmac]);

    // initialize data cipher
    const data_cipher_key = EVP_BytesToKey(Buffer.from(userKey.toString('base64') + this._lastClientHash.toString('base64')), 16, 16);
    this._cipher = crypto.createCipheriv('rc4', data_cipher_key, NOOP);
    this._decipher = crypto.createDecipheriv('rc4', data_cipher_key, NOOP);

    return Buffer.concat([part1, part2]);
  }

  createChunks(buffer) {
    const userKey = this._userKey;
    const max_payload_size = this._config.is_client ? 2800 : (this._tcpMss - this._overhead);
    return getChunks(buffer, max_payload_size).map((payload) => {
      let _payload = payload;
      if (this._config.is_server && this._encodeChunkId === 1) {
        _payload = Buffer.concat([ntb(this._tcpMss, 2, BYTE_ORDER_LE), payload]);
      }
      const rc4_enc_payload = this._cipher.update(_payload);
      const hash = this._config.is_client ? this._lastClientHash : this._lastServerHash;
      const size = rc4_enc_payload.length ^ hash.slice(-2).readUInt16LE(0);
      // generate two pieces of random bytes
      const rng = this._config.is_client ? this._rngClient : this._rngServer;
      const random_bytes_len = this.getRandomBytesLengthForTcp(hash, _payload.length, rng);
      const random_bytes = crypto.randomBytes(random_bytes_len);
      const random_divide_pos = random_bytes_len > 0 ? rng.next().mod(8589934609).mod(random_bytes_len).toNumber() : 0;
      const random_bytes_a = random_bytes.slice(0, random_divide_pos);
      const random_bytes_b = random_bytes.slice(random_divide_pos);
      // assemble chunk
      let chunk = Buffer.concat([ntb(size, 2, BYTE_ORDER_LE), random_bytes_a, rc4_enc_payload, random_bytes_b]);
      const hmac_key = Buffer.concat([userKey, ntb(this._encodeChunkId, 4, BYTE_ORDER_LE)]);
      const chunk_hmac = hmac('md5', hmac_key, chunk);
      chunk = Buffer.concat([chunk, chunk_hmac.slice(0, 2)]);
      if (this._config.is_client) {
        this._lastClientHash = chunk_hmac;
      } else {
        this._lastServerHash = chunk_hmac;
      }
      this._encodeChunkId += 1;
      return chunk;
    });
  }

  // tcp

  clientOut({ buffer }) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      return Buffer.concat([this.createRequest(), Buffer.concat(this.createChunks(buffer))]);
    } else {
      return Buffer.concat(this.createChunks(buffer));
    }
  }

  serverOut({ buffer }) {
    return Buffer.concat(this.createChunks(buffer));
  }

  serverIn({ buffer, next, fail }) {
    if (!this._isHeaderRecv) {
      if (buffer.length < 36) {
        return fail(`handshake request is too short to parse, request=${dumpHex(buffer)}`);
      }

      const userKey = this._userKey = this.readProperty('ss-stream-cipher', 'key');
      const iv = this.readProperty('ss-stream-cipher', 'iv');
      const part12_hmac_key = Buffer.concat([iv, userKey]);

      // part 1
      const part1_random = buffer.slice(0, 4);
      const part1_hmac = buffer.slice(4, 12);
      const part1_hmac_calc = hmac('md5', part12_hmac_key, part1_random);
      if (!part1_hmac_calc.slice(0, 8).equals(part1_hmac)) {
        return fail(`unexpected hmac in part 1, dump=${dumpHex(buffer)}`);
      }
      this._lastClientHash = part1_hmac_calc;

      // part 2
      const part2_hmac = buffer.slice(32, 36);
      const part2_hmac_calc = hmac('md5', userKey, buffer.slice(12, 32));
      if (!part2_hmac_calc.slice(0, 4).equals(part2_hmac)) {
        return fail(`unexpected hmac in part 2, dump=${dumpHex(buffer)}`);
      }
      this._lastServerHash = part2_hmac_calc;

      // const uid = xor(buffer.slice(12, 16), part1_hmac.slice(8, 12));
      const cbc_enc_header = buffer.slice(16, 32);

      const decipher_key = EVP_BytesToKey(userKey.toString('base64') + this._salt, 16, 16);
      const decipher = crypto.createDecipheriv('aes-128-cbc', decipher_key, Buffer.alloc(16));
      const header = decipher.update(Buffer.concat([
        cbc_enc_header,
        Buffer.alloc(1) // we need one more byte to get plaintext from the second block
      ]));

      const utc = header.slice(0, 4);
      const time_diff = Math.abs(utc.readUInt32LE(0) - getCurrentTimestampInt());
      if (time_diff > MAX_TIME_DIFF) {
        return fail(`timestamp diff is over ${MAX_TIME_DIFF}s, dump=${dumpHex(buffer)}`);
      }

      // NOTE: blinksocks's implementation doesn't support multiple user, so client_id and connection_id are useless.
      // const client_id = header.slice(4, 8);
      // const connection_id = header.slice(8, 12);

      this._overhead = header.slice(12, 14).readUInt16LE(0);

      // initialize data cipher
      const data_cipher_key = EVP_BytesToKey(Buffer.from(userKey.toString('base64') + this._lastClientHash.toString('base64')), 16, 16);
      this._cipher = crypto.createCipheriv('rc4', data_cipher_key, NOOP);
      this._decipher = crypto.createDecipheriv('rc4', data_cipher_key, NOOP);

      this._isHeaderRecv = true;

      if (buffer.length > 36) {
        this._adBuf.put(buffer.slice(36), { next, fail });
      }
    } else {
      this._adBuf.put(buffer, { next, fail });
    }
  }

  clientIn({ buffer, next, fail }) {
    this._adBuf.put(buffer, { next, fail });
  }

  onReceiving(buffer, { fail }) {
    if (buffer.length < 2 || this._adBuf === null) {
      return; // too short to get size
    }
    const hash = this._config.is_client ? this._lastServerHash : this._lastClientHash;
    const payload_len = buffer.readUInt16LE(0) ^ hash.readUInt16LE(14);
    const rng = this._config.is_client ? this._rngServer : this._rngClient;
    const random_bytes_len = this.getRandomBytesLengthForTcp(hash, payload_len, rng);
    const chunk_size = 2 + random_bytes_len + payload_len + 2;
    if (chunk_size >= 4096) {
      fail(`invalid chunk, chunk size=${chunk_size} is greater than 4096, dump=${dumpHex(buffer)}`);
      return -1;
    }
    return chunk_size;
  }

  onChunkReceived(chunk, { next, fail }) {
    const userKey = this._userKey;
    if (chunk.length < 2) {
      return fail(`invalid chunk, size=${chunk.length} dump=${dumpHex(chunk)}`);
    }
    // check chunk
    const hmac_key = Buffer.concat([userKey, ntb(this._decodeChunkId, 4, BYTE_ORDER_LE)]);
    const new_hash = hmac('md5', hmac_key, chunk.slice(0, -2));
    const chunk_hmac_calc = new_hash.slice(0, 2);
    const chunk_hmac = chunk.slice(-2);
    if (!chunk_hmac_calc.equals(chunk_hmac)) {
      return fail(`unexpected chunk hmac, chunk=${dumpHex(chunk)}`);
    }
    // drop random_bytes, get encrypted payload
    const hash = this._config.is_client ? this._lastServerHash : this._lastClientHash;
    const payload_len = chunk.readUInt16LE(0) ^ hash.readUInt16LE(14);
    const rng = this._config.is_client ? this._rngServer : this._rngClient;
    const random_bytes_len = this.getRandomBytesLengthForTcp(hash, payload_len, rng);
    let enc_payload = null;
    if (random_bytes_len > 0) {
      const random_divide_pos = rng.next().mod(8589934609).mod(random_bytes_len).toNumber();
      enc_payload = chunk.slice(2 + random_divide_pos, 2 + random_divide_pos + payload_len);
    } else {
      enc_payload = chunk.slice(2, 2 + payload_len);
    }
    // decrypt payload
    let payload = this._decipher.update(enc_payload);
    // update hash
    if (this._config.is_client) {
      this._lastServerHash = new_hash;
    } else {
      this._lastClientHash = new_hash;
    }
    if (this._config.is_client && this._decodeChunkId === 1) {
      this._tcpMss = payload.readUInt16LE(0);
      payload = payload.slice(2);
    }
    this._decodeChunkId += 1;
    next(payload);
  }

  // udp

  clientOutUdp({ buffer }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');
    const random = crypto.randomBytes(3);
    const tmp_mac = hmac('md5', userKey, random);
    const uid = xor(crypto.randomBytes(4), tmp_mac.slice(0, 4));
    const random_bytes = crypto.randomBytes(this.getRandomBytesLengthForUdp(tmp_mac, this._rngClient));

    const cipher_key = EVP_BytesToKey(Buffer.from(userKey.toString('base64') + tmp_mac.toString('base64')), 16, 16);
    const cipher = crypto.createCipheriv('rc4', cipher_key, NOOP);
    const enc_payload = cipher.update(buffer);

    const packet = Buffer.concat([enc_payload, random_bytes, random, uid]);
    const packet_hmac = hmac('md5', userKey, packet).slice(0, 1);

    return Buffer.concat([packet, packet_hmac]);
  }

  serverInUdp({ buffer, fail }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');
    const packet = buffer.slice(0, -1);
    const packet_hmac = buffer.slice(-1);
    const packet_hmac_calc = hmac('md5', userKey, packet).slice(0, 1);
    if (!packet_hmac_calc.equals(packet_hmac)) {
      return fail(`unexpected hmac when verify client udp packet, dump=${dumpHex(buffer)}`);
    }
    const random = buffer.slice(-8, -5);
    const tmp_mac = hmac('md5', userKey, random);
    // const uid = xor(buffer.slice(-5, -1), tmp_mac.slice(0, 4));
    const random_bytes_len = this.getRandomBytesLengthForUdp(tmp_mac, this._rngClient);

    const decipher_key = EVP_BytesToKey(Buffer.from(userKey.toString('base64') + tmp_mac.toString('base64')), 16, 16);
    const decipher = crypto.createDecipheriv('rc4', decipher_key, NOOP);

    const enc_payload = buffer.slice(0, -8 - random_bytes_len);
    return decipher.update(enc_payload);
  }

  serverOutUdp({ buffer }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');
    const random = crypto.randomBytes(7);
    const tmp_mac = hmac('md5', userKey, random);
    const random_bytes = crypto.randomBytes(this.getRandomBytesLengthForUdp(tmp_mac, this._rngServer));

    const cipher_key = EVP_BytesToKey(Buffer.from(userKey.toString('base64') + tmp_mac.toString('base64')), 16, 16);
    const cipher = crypto.createCipheriv('rc4', cipher_key, NOOP);
    const enc_payload = cipher.update(buffer);

    const packet = Buffer.concat([enc_payload, random_bytes, random]);
    const packet_hmac = hmac('md5', userKey, packet).slice(0, 1);

    return Buffer.concat([packet, packet_hmac]);
  }

  clientInUdp({ buffer, fail }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');
    const packet = buffer.slice(0, -1);
    const packet_hmac = buffer.slice(-1);
    const packet_hmac_calc = hmac('md5', userKey, packet).slice(0, 1);
    if (!packet_hmac_calc.equals(packet_hmac)) {
      return fail(`unexpected hmac when verify server udp packet, dump=${dumpHex(buffer)}`);
    }
    const random = buffer.slice(-8, -1);
    const tmp_mac = hmac('md5', userKey, random);
    const random_bytes_len = this.getRandomBytesLengthForUdp(tmp_mac, this._rngServer);

    const decipher_key = EVP_BytesToKey(Buffer.from(userKey.toString('base64') + tmp_mac.toString('base64')), 16, 16);
    const decipher = crypto.createDecipheriv('rc4', decipher_key, NOOP);

    const enc_payload = buffer.slice(0, -8 - random_bytes_len);
    return decipher.update(enc_payload);
  }

}
