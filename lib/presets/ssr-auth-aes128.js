"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _crypto = _interopRequireDefault(require("crypto"));

var _defs = require("./defs");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const DEFAULT_HMAC_HASH_FUNC = 'md5';
const DEFAULT_SALT = 'auth_aes128_md5';
const MAX_TIME_DIFF = 30;

class SsrAuthAes128Preset extends _defs.IPreset {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_clientId", null);

    _defineProperty(this, "_connectionId", null);

    _defineProperty(this, "_userKey", null);

    _defineProperty(this, "_hashFunc", DEFAULT_HMAC_HASH_FUNC);

    _defineProperty(this, "_salt", DEFAULT_SALT);

    _defineProperty(this, "_isHeaderSent", false);

    _defineProperty(this, "_isHeaderRecv", false);

    _defineProperty(this, "_encodeChunkId", 1);

    _defineProperty(this, "_decodeChunkId", 1);

    _defineProperty(this, "_adBuf", null);
  }

  onInit() {
    this._clientId = _crypto.default.randomBytes(4);
    this._connectionId = (0, _utils.getRandomInt)(0, 0x00ffffff);
    this._adBuf = new _utils.AdvancedBuffer({
      getPacketLength: this.onReceiving.bind(this)
    });

    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onDestroy() {
    this._userKey = null;

    this._adBuf.clear();

    this._adBuf = null;
  }

  createHmac(buffer, key) {
    return (0, _utils.hmac)(this._hashFunc, key, buffer);
  }

  createRequest(buffer) {
    const clientId = this._clientId;
    const connectionId = this._connectionId;
    const userKey = this._userKey = this.readProperty('ss-stream-cipher', 'key');
    const iv = this.readProperty('ss-stream-cipher', 'iv');
    const part12_hmac_key = Buffer.concat([iv, userKey]);

    const part1_random = _crypto.default.randomBytes(1);

    const part1_hmac = this.createHmac(part1_random, part12_hmac_key).slice(0, 6);
    const part1 = Buffer.concat([part1_random, part1_hmac]);

    const uid = _crypto.default.randomBytes(4);

    const utc = (0, _utils.numberToBuffer)((0, _utils.getCurrentTimestampInt)(), 4, _utils.BYTE_ORDER_LE);
    let client_id = clientId;
    let connection_id = connectionId;

    if (connectionId > 0xff000000) {
      connection_id = (0, _utils.getRandomInt)(0, 0x00ffffff);
      client_id = _crypto.default.randomBytes(4);
      this._connectionId = connection_id;
    } else {
      connection_id = ++this._connectionId;
    }

    const random_bytes_len = (0, _utils.getRandomInt)(0, buffer.length > 400 ? 512 : 1024);
    const pack_len = (0, _utils.numberToBuffer)(7 + 24 + (random_bytes_len + buffer.length + 4), 2, _utils.BYTE_ORDER_LE);
    const header = Buffer.concat([utc, client_id, (0, _utils.numberToBuffer)(connection_id, 4, _utils.BYTE_ORDER_LE), pack_len, (0, _utils.numberToBuffer)(random_bytes_len, 2, _utils.BYTE_ORDER_LE)]);
    const cipher_key = (0, _utils.EVP_BytesToKey)(userKey.toString('base64') + this._salt, 16, 16);

    const cipher = _crypto.default.createCipheriv('aes-128-cbc', cipher_key, Buffer.alloc(16));

    const cbc_enc_header = cipher.update(header);
    let part2 = Buffer.concat([uid, cbc_enc_header]);
    const part2_hmac = this.createHmac(part2, part12_hmac_key).slice(0, 4);
    part2 = Buffer.concat([part2, part2_hmac]);

    const random_bytes = _crypto.default.randomBytes(random_bytes_len);

    let part3 = Buffer.concat([random_bytes, buffer]);
    const part3_hmac = this.createHmac(Buffer.concat([part1, part2, part3]), userKey).slice(0, 4);
    part3 = Buffer.concat([part3, part3_hmac]);
    return Buffer.concat([part1, part2, part3]);
  }

  createChunks(buffer) {
    const userKey = this._userKey;
    return (0, _utils.getRandomChunks)(buffer, 0x1fff - 0xff - 8 - 3, 0x2000 - 0xff - 8 - 3).map(payload => {
      const [first, len] = _crypto.default.randomBytes(2);

      let random_bytes = null;

      if (first < 128) {
        random_bytes = Buffer.concat([Buffer.from([len + 1]), _crypto.default.randomBytes(len)]);
      } else {
        const _len = len < 2 ? 2 : len;

        random_bytes = Buffer.concat([Buffer.from([0xff]), (0, _utils.numberToBuffer)(_len + 1, 2, _utils.BYTE_ORDER_LE), _crypto.default.randomBytes(_len - 2)]);
      }

      const hmac_key = Buffer.concat([userKey, (0, _utils.numberToBuffer)(this._encodeChunkId, 4, _utils.BYTE_ORDER_LE)]);
      const size = (0, _utils.numberToBuffer)(8 + random_bytes.length + payload.length, 2, _utils.BYTE_ORDER_LE);
      const size_hmac = this.createHmac(size, hmac_key).slice(0, 2);
      let chunk = Buffer.concat([size, size_hmac, random_bytes, payload]);
      const chunk_hmac = this.createHmac(chunk, hmac_key).slice(0, 4);
      chunk = Buffer.concat([chunk, chunk_hmac]);
      this._encodeChunkId += 1;
      return chunk;
    });
  }

  clientOut({
    buffer
  }) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      const headSize = this.readProperty('ss-base', 'headSize');
      const dividePos = Math.min(buffer.length, (0, _utils.getRandomInt)(0, 31) + headSize);
      return Buffer.concat([this.createRequest(buffer.slice(0, dividePos)), Buffer.concat(this.createChunks(buffer.slice(dividePos)))]);
    } else {
      const chunks = this.createChunks(buffer);
      return Buffer.concat(chunks);
    }
  }

  serverOut({
    buffer
  }) {
    return Buffer.concat(this.createChunks(buffer));
  }

  serverIn({
    buffer,
    next,
    fail
  }) {
    if (!this._isHeaderRecv) {
      if (buffer.length < 42) {
        return fail(`handshake request is too short to parse, request=${(0, _utils.dumpHex)(buffer)}`);
      }

      const userKey = this._userKey = this.readProperty('ss-stream-cipher', 'key');
      const iv = this.readProperty('ss-stream-cipher', 'iv');
      const part12_hmac_key = Buffer.concat([iv, userKey]);
      const part1_hmac = buffer.slice(1, 7);
      const part1_hmac_calc = this.createHmac(buffer.slice(0, 1), part12_hmac_key).slice(0, 6);

      if (!part1_hmac_calc.equals(part1_hmac)) {
        return fail(`unexpected hmac in part 1, dump=${(0, _utils.dumpHex)(buffer)}`);
      }

      const part2_hmac = buffer.slice(27, 31);
      const part2_hmac_calc = this.createHmac(buffer.slice(7, 27), part12_hmac_key).slice(0, 4);

      if (!part2_hmac_calc.equals(part2_hmac)) {
        return fail(`unexpected hmac in part 2, dump=${(0, _utils.dumpHex)(buffer)}`);
      }

      const cbc_enc_header = buffer.slice(11, 27);
      const decipher_key = (0, _utils.EVP_BytesToKey)(userKey.toString('base64') + this._salt, 16, 16);

      const decipher = _crypto.default.createDecipheriv('aes-128-cbc', decipher_key, Buffer.alloc(16));

      const header = decipher.update(Buffer.concat([cbc_enc_header, Buffer.alloc(1)]));
      const pack_len = header.slice(12, 14).readUInt16LE(0);

      if (buffer.length < pack_len) {
        return fail(`pack length in part 2 is too long, dump=${(0, _utils.dumpHex)(buffer)}`);
      }

      const utc = header.slice(0, 4);
      const random_bytes_len = header.slice(14, 16).readUInt16LE(0);
      const part3_hmac = buffer.slice(pack_len - 4, pack_len);
      const part3_hmac_calc = this.createHmac(buffer.slice(0, pack_len - 4), userKey).slice(0, 4);

      if (!part3_hmac_calc.equals(part3_hmac)) {
        return fail(`unexpected hmac in part 3, dump=${(0, _utils.dumpHex)(buffer)}`);
      }

      const time_diff = Math.abs(utc.readUInt32LE(0) - (0, _utils.getCurrentTimestampInt)());

      if (time_diff > MAX_TIME_DIFF) {
        return fail(`timestamp diff is over ${MAX_TIME_DIFF}s, dump=${(0, _utils.dumpHex)(buffer)}`);
      }

      const payload = buffer.slice(31 + random_bytes_len, pack_len - 4);
      const extra_chunk = buffer.slice(pack_len);
      this._isHeaderRecv = true;
      next(payload);

      if (extra_chunk.length > 0) {
        this._adBuf.put(extra_chunk, {
          next,
          fail
        });
      }
    } else {
      this._adBuf.put(buffer, {
        next,
        fail
      });
    }
  }

  clientIn({
    buffer,
    next,
    fail
  }) {
    this._adBuf.put(buffer, {
      next,
      fail
    });
  }

  onReceiving(buffer, {
    fail
  }) {
    const userKey = this._userKey;

    if (buffer.length < 4) {
      return;
    }

    const size_buf = buffer.slice(0, 2);
    const size_hmac = buffer.slice(2, 4);
    const hmac_key = Buffer.concat([userKey, (0, _utils.numberToBuffer)(this._decodeChunkId, 4, _utils.BYTE_ORDER_LE)]);
    const size_hmac_calc = this.createHmac(size_buf, hmac_key).slice(0, 2);

    if (!size_hmac_calc.equals(size_hmac)) {
      fail(`unexpected size hmac when verify size=${(0, _utils.dumpHex)(size_buf)}, dump=${(0, _utils.dumpHex)(buffer)}`);
      return -1;
    }

    const size = size_buf.readUInt16LE(0);

    if (size < 8 || size > 0x2000) {
      fail(`chunk size is invalid, size=${size} dump=${(0, _utils.dumpHex)(buffer)}`);
      return -1;
    }

    return size;
  }

  onChunkReceived(chunk, {
    next,
    fail
  }) {
    const userKey = this._userKey;

    if (chunk.length < 9) {
      return fail(`invalid chunk size=${chunk.length} dump=${(0, _utils.dumpHex)(chunk)}`);
    }

    const chunk_hmac = chunk.slice(-4);
    const hmac_key = Buffer.concat([userKey, (0, _utils.numberToBuffer)(this._decodeChunkId, 4, _utils.BYTE_ORDER_LE)]);
    const chunk_hmac_calc = this.createHmac(chunk.slice(0, -4), hmac_key).slice(0, 4);

    if (!chunk_hmac_calc.equals(chunk_hmac)) {
      return fail(`unexpected chunk hmac, chunk=${(0, _utils.dumpHex)(chunk)}`);
    }

    this._decodeChunkId += 1;
    const random_bytes_len = chunk[4] < 0xff ? chunk[4] : chunk.readUInt16LE(5);
    const payload = chunk.slice(4 + random_bytes_len, -4);
    next(payload);
  }

  clientOutUdp({
    buffer
  }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');

    const uid = _crypto.default.randomBytes(4);

    const packet = Buffer.concat([buffer, uid]);
    const packet_hmac = this.createHmac(packet, userKey).slice(0, 4);
    return Buffer.concat([packet, packet_hmac]);
  }

  serverInUdp({
    buffer,
    fail
  }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');
    const payload = buffer.slice(0, -8);
    const packet_hmac = buffer.slice(-4);
    const packet_hmac_calc = this.createHmac(buffer.slice(0, -4), userKey).slice(0, 4);

    if (!packet_hmac_calc.equals(packet_hmac)) {
      return fail(`unexpected hmac when verify client udp packet, dump=${(0, _utils.dumpHex)(buffer)}`);
    }

    return payload;
  }

  serverOutUdp({
    buffer
  }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');
    const payload_hmac = this.createHmac(buffer, userKey).slice(0, 4);
    return Buffer.concat([buffer, payload_hmac]);
  }

  clientInUdp({
    buffer,
    fail
  }) {
    const userKey = this.readProperty('ss-stream-cipher', 'key');
    const payload = buffer.slice(0, -4);
    const payload_hmac = buffer.slice(-4);
    const payload_hmac_calc = this.createHmac(payload, userKey).slice(0, 4);

    if (!payload_hmac_calc.equals(payload_hmac)) {
      return fail(`unexpected hmac when verify server udp packet, dump=${(0, _utils.dumpHex)(buffer)}`);
    }

    return payload;
  }

}

exports.default = SsrAuthAes128Preset;