import crypto from 'crypto';
import { IPreset } from './defs';
import {
  hmac,
  EVP_BytesToKey,
  dumpHex,
  getCurrentTimestampInt,
  getRandomInt,
  getRandomChunks,
  numberToBuffer as ntb, BYTE_ORDER_LE,
  AdvancedBuffer,
} from '../utils';

const DEFAULT_HMAC_HASH_FUNC = 'md5';
const DEFAULT_SALT = 'auth_aes128_md5';
const MAX_TIME_DIFF = 30; // seconds

/**
 * @description
 *   shadowsocksr "auth_aes128_xxx" implementation.
 *
 * @protocol
 *
 *   # TCP handshake request (client -> server)
 *   +--------+--------+----------+
 *   | part 1 | part 2 |  part 3  |
 *   +--------+--------+----------+
 *   |   7    |   24   | Variable |
 *   +--------+--------+----------+
 *
 *   part 1
 *   +--------+----------+
 *   | Random |   HMAC   |
 *   +--------+----------+
 *   |    1   |     6    |
 *   +--------+----------+
 *
 *   part 2
 *   +-----+----------------------------+----------+
 *   | UID | AES-128-CBC encrypted data |   HMAC   |
 *   +-----+----------------------------+----------+
 *   |  4  |             16             |     4    |
 *   +-----+----------------------------+----------+
 *
 *   AES-128-CBC encrypted data
 *   +-----+-----+---------------+-------------+---------------------+
 *   | UTC | CID | Connection ID | pack length | Random bytes length |
 *   +-----+---------------------+-------------+---------------------+
 *   |  4  |  4  |       4       |      2      |           2         |
 *   +-----+-----+---------------+-------------+---------------------+
 *
 *   part 3
 *   +--------------+------------------+----------+
 *   | Random bytes | Origin SS stream |   HMAC   |
 *   +--------------+------------------+----------+
 *   |   Variable   |     Variable     |     4    |
 *   +--------------+------------------+----------+
 *
 *   # TCP chunks
 *   +------+----------+--------------+-------------------------+----------+
 *   | size |   HMAC   | Random bytes |         Payload         |   HMAC   |
 *   +------+----------+--------------+-------------------------+----------+
 *   |  2   |     2    |   Variable   | size - Random bytes - 8 |     4    |
 *   +------+----------+--------------+-------------------------+----------+
 *
 *   # UDP (client -> server)
 *   +----------+-----+----------+
 *   |  Payload | UID |   HMAC   |
 *   +----------+-----+----------+
 *   | Variable |  4  |     4    |
 *   +----------+-----+----------+
 *
 *   # UDP (server -> client)
 *   +----------+----------+
 *   |  Payload |   HMAC   |
 *   +----------+----------+
 *   | Variable |     4    |
 *   +----------+----------+
 *
 * @reference
 *   https://github.com/shadowsocksr-rm/shadowsocks-rss/blob/master/doc/auth_aes128.md
 */
export default class SsrAuthAes128Preset extends IPreset {

  _clientId = null;

  _connectionId = null;

  _userKey = null;

  _hashFunc = DEFAULT_HMAC_HASH_FUNC; // overwrite by subclass

  _salt = DEFAULT_SALT; // overwrite by subclass

  _isHeaderSent = false;

  _isHeaderRecv = false;

  _encodeChunkId = 1;

  _decodeChunkId = 1;

  _adBuf = null;

  onInit() {
    this._clientId = crypto.randomBytes(4);
    this._connectionId = getRandomInt(0, 0x00ffffff);
    this._adBuf = new AdvancedBuffer({ getPacketLength: this.onReceiving.bind(this) });
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onDestroy() {
    this._userKey = null;
    this._adBuf.clear();
    this._adBuf = null;
  }

  createHmac(buffer, key) {
    return hmac(this._hashFunc, key, buffer);
  }

  createRequest(buffer) {
    const clientId = this._clientId;
    const connectionId = this._connectionId;

    const userKey = this._userKey = this.readProperty('ss-stream-cipher', 'key');
    const iv = this.readProperty('ss-stream-cipher', 'iv');
    const part12_hmac_key = Buffer.concat([iv, userKey]);

    // part 1
    const part1_random = crypto.randomBytes(1);
    const part1_hmac = this.createHmac(part1_random, part12_hmac_key).slice(0, 6);
    const part1 = Buffer.concat([part1_random, part1_hmac]);

    // part 2
    const uid = crypto.randomBytes(4); // always generate a new uid(user id)

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

    const random_bytes_len = getRandomInt(0, buffer.length > 400 ? 512 : 1024);
    const pack_len = ntb(7 + 24 + (random_bytes_len + buffer.length + 4), 2, BYTE_ORDER_LE);
    const header = Buffer.concat([utc, client_id, ntb(connection_id, 4, BYTE_ORDER_LE), pack_len, ntb(random_bytes_len, 2, BYTE_ORDER_LE)]);

    // prepare cipher for part2 encryption
    const cipher_key = EVP_BytesToKey(userKey.toString('base64') + this._salt, 16, 16);
    const cipher = crypto.createCipheriv('aes-128-cbc', cipher_key, Buffer.alloc(16));
    const cbc_enc_header = cipher.update(header);

    let part2 = Buffer.concat([uid, cbc_enc_header]);
    const part2_hmac = this.createHmac(part2, part12_hmac_key).slice(0, 4);
    part2 = Buffer.concat([part2, part2_hmac]);

    // part 3, chunks
    const random_bytes = crypto.randomBytes(random_bytes_len);
    let part3 = Buffer.concat([random_bytes, buffer]);
    const part3_hmac = this.createHmac(Buffer.concat([part1, part2, part3]), userKey).slice(0, 4);
    part3 = Buffer.concat([part3, part3_hmac]);

    return Buffer.concat([part1, part2, part3]);
  }

  createChunks(buffer) {
    const userKey = this._userKey;
    return getRandomChunks(buffer, 0x1fff - 0xff - 8 - 3, 0x2000 - 0xff - 8 - 3).map((payload) => {
      const [first, len] = crypto.randomBytes(2);
      let random_bytes = null;
      if (first < 128) {
        random_bytes = Buffer.concat([Buffer.from([len + 1]), crypto.randomBytes(len)]);
      } else {
        const _len = len < 2 ? 2 : len;
        random_bytes = Buffer.concat([Buffer.from([0xff]), ntb(_len + 1, 2, BYTE_ORDER_LE), crypto.randomBytes(_len - 2)]);
      }
      const hmac_key = Buffer.concat([userKey, ntb(this._encodeChunkId, 4, BYTE_ORDER_LE)]);
      const size = ntb(8 + random_bytes.length + payload.length, 2, BYTE_ORDER_LE);
      const size_hmac = this.createHmac(size, hmac_key).slice(0, 2);
      let chunk = Buffer.concat([size, size_hmac, random_bytes, payload]);
      const chunk_hmac = this.createHmac(chunk, hmac_key).slice(0, 4);
      chunk = Buffer.concat([chunk, chunk_hmac]);
      this._encodeChunkId += 1;
      return chunk;
    });
  }

  // tcp

  clientOut({ buffer }) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      const headSize = this.readProperty('ss-base', 'headSize');
      const dividePos = Math.min(buffer.length, getRandomInt(0, 31) + headSize);
      return Buffer.concat([
        this.createRequest(buffer.slice(0, dividePos)),
        Buffer.concat(this.createChunks(buffer.slice(dividePos)))
      ]);
    } else {
      const chunks = this.createChunks(buffer);
      return Buffer.concat(chunks);
    }
  }

  serverOut({ buffer }) {
    return Buffer.concat(this.createChunks(buffer));
  }

  serverIn({ buffer, next, fail }) {
    if (!this._isHeaderRecv) {
      if (buffer.length < 42) {
        return fail(`handshake request is too short to parse, request=${dumpHex(buffer)}`);
      }

      const userKey = this._userKey = this.readProperty('ss-stream-cipher', 'key');
      const iv = this.readProperty('ss-stream-cipher', 'iv');
      const part12_hmac_key = Buffer.concat([iv, userKey]);

      // part 1
      const part1_hmac = buffer.slice(1, 7);
      const part1_hmac_calc = this.createHmac(buffer.slice(0, 1), part12_hmac_key).slice(0, 6);
      if (!part1_hmac_calc.equals(part1_hmac)) {
        return fail(`unexpected hmac in part 1, dump=${dumpHex(buffer)}`);
      }

      // part 2
      const part2_hmac = buffer.slice(27, 31);
      const part2_hmac_calc = this.createHmac(buffer.slice(7, 27), part12_hmac_key).slice(0, 4);
      if (!part2_hmac_calc.equals(part2_hmac)) {
        return fail(`unexpected hmac in part 2, dump=${dumpHex(buffer)}`);
      }

      // const uid = buffer.slice(7, 11);
      const cbc_enc_header = buffer.slice(11, 27);

      const decipher_key = EVP_BytesToKey(userKey.toString('base64') + this._salt, 16, 16);
      const decipher = crypto.createDecipheriv('aes-128-cbc', decipher_key, Buffer.alloc(16));
      const header = decipher.update(Buffer.concat([
        cbc_enc_header,
        Buffer.alloc(1) // we need one more byte to get plaintext from the second block
      ]));

      const pack_len = header.slice(12, 14).readUInt16LE(0);
      if (buffer.length < pack_len) {
        return fail(`pack length in part 2 is too long, dump=${dumpHex(buffer)}`);
      }

      const utc = header.slice(0, 4);
      // NOTE: blinksocks's implementation doesn't support multiple user, so client_id and connection_id are useless.
      // const client_id = header.slice(4, 8);
      // const connection_id = header.slice(8, 12);
      const random_bytes_len = header.slice(14, 16).readUInt16LE(0);

      // part 3
      // const random_bytes = buffer.slice(31, 31 + random_bytes_len);
      const part3_hmac = buffer.slice(pack_len - 4, pack_len);
      const part3_hmac_calc = this.createHmac(buffer.slice(0, pack_len - 4), userKey).slice(0, 4);
      if (!part3_hmac_calc.equals(part3_hmac)) {
        return fail(`unexpected hmac in part 3, dump=${dumpHex(buffer)}`);
      }

      const time_diff = Math.abs(utc.readUInt32LE(0) - getCurrentTimestampInt());
      if (time_diff > MAX_TIME_DIFF) {
        return fail(`timestamp diff is over ${MAX_TIME_DIFF}s, dump=${dumpHex(buffer)}`);
      }

      const payload = buffer.slice(31 + random_bytes_len, pack_len - 4);
      const extra_chunk = buffer.slice(pack_len);

      this._isHeaderRecv = true;

      next(payload);

      if (extra_chunk.length > 0) {
        this._adBuf.put(extra_chunk, { next, fail });
      }
    } else {
      this._adBuf.put(buffer, { next, fail });
    }
  }

  clientIn({ buffer, next, fail }) {
    this._adBuf.put(buffer, { next, fail });
  }

  onReceiving(buffer, { fail }) {
    const userKey = this._userKey;
    if (buffer.length < 4) {
      return; // too short to get size and size_hmac
    }
    const size_buf = buffer.slice(0, 2);
    const size_hmac = buffer.slice(2, 4);
    const hmac_key = Buffer.concat([userKey, ntb(this._decodeChunkId, 4, BYTE_ORDER_LE)]);
    // check size
    const size_hmac_calc = this.createHmac(size_buf, hmac_key).slice(0, 2);
    if (!size_hmac_calc.equals(size_hmac)) {
      fail(`unexpected size hmac when verify size=${dumpHex(size_buf)}, dump=${dumpHex(buffer)}`);
      return -1;
    }
    const size = size_buf.readUInt16LE(0);
    if (size < 8 || size > 0x2000) {
      fail(`chunk size is invalid, size=${size} dump=${dumpHex(buffer)}`);
      return -1;
    }
    return size;
  }

  onChunkReceived(chunk, { next, fail }) {
    const userKey = this._userKey;
    if (chunk.length < 9) {
      return fail(`invalid chunk size=${chunk.length} dump=${dumpHex(chunk)}`);
    }
    // check chunk
    const chunk_hmac = chunk.slice(-4);
    const hmac_key = Buffer.concat([userKey, ntb(this._decodeChunkId, 4, BYTE_ORDER_LE)]);
    const chunk_hmac_calc = this.createHmac(chunk.slice(0, -4), hmac_key).slice(0, 4);
    if (!chunk_hmac_calc.equals(chunk_hmac)) {
      return fail(`unexpected chunk hmac, chunk=${dumpHex(chunk)}`);
    }
    this._decodeChunkId += 1;
    const random_bytes_len = chunk[4] < 0xff ? chunk[4] : chunk.readUInt16LE(5);
    const payload = chunk.slice(4 + random_bytes_len, -4);
    next(payload);
  }

  // udp

  clientOutUdp({ buffer }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');
    const uid = crypto.randomBytes(4);
    const packet = Buffer.concat([buffer, uid]);
    const packet_hmac = this.createHmac(packet, userKey).slice(0, 4);
    return Buffer.concat([packet, packet_hmac]);
  }

  serverInUdp({ buffer, fail }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');
    const payload = buffer.slice(0, -8);
    // const uid = buffer.slice(-8, -4);
    const packet_hmac = buffer.slice(-4);
    const packet_hmac_calc = this.createHmac(buffer.slice(0, -4), userKey).slice(0, 4);
    if (!packet_hmac_calc.equals(packet_hmac)) {
      return fail(`unexpected hmac when verify client udp packet, dump=${dumpHex(buffer)}`);
    }
    return payload;
  }

  serverOutUdp({ buffer }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');
    const payload_hmac = this.createHmac(buffer, userKey).slice(0, 4);
    return Buffer.concat([buffer, payload_hmac]);
  }

  clientInUdp({ buffer, fail }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');
    const payload = buffer.slice(0, -4);
    const payload_hmac = buffer.slice(-4);
    const payload_hmac_calc = this.createHmac(payload, userKey).slice(0, 4);
    if (!payload_hmac_calc.equals(payload_hmac)) {
      return fail(`unexpected hmac when verify server udp packet, dump=${dumpHex(buffer)}`);
    }
    return payload;
  }

}
