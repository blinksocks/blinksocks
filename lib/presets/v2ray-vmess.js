"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _net = _interopRequireDefault(require("net"));

var _crypto = _interopRequireDefault(require("crypto"));

var _ip = _interopRequireDefault(require("ip"));

var _defs = require("./defs");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const ATYP_V4 = 0x01;
const ATYP_DOMAIN = 0x02;
const ATYP_V6 = 0x03;
const TIME_TOLERANCE = 30;

function getAddrType(host) {
  if (_net.default.isIPv4(host)) {
    return ATYP_V4;
  }

  if (_net.default.isIPv6(host)) {
    return ATYP_V6;
  }

  return ATYP_DOMAIN;
}

const SECURITY_TYPE_AES_128_GCM = 3;
const SECURITY_TYPE_CHACHA20_POLY1305 = 4;
const SECURITY_TYPE_NONE = 5;
const securityTypes = {
  'aes-128-gcm': SECURITY_TYPE_AES_128_GCM,
  'chacha20-poly1305': SECURITY_TYPE_CHACHA20_POLY1305,
  'none': SECURITY_TYPE_NONE
};
let libsodium = null;

function createChacha20Poly1305Key(key) {
  const md5Key = (0, _utils.hash)('md5', key);
  return Buffer.concat([md5Key, (0, _utils.hash)('md5', md5Key)]);
}

function getUUIDBuffer(id) {
  return Buffer.from(id.split('-').join(''), 'hex');
}

class V2rayVmessPreset extends _defs.IPresetAddressing {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_uuid", null);

    _defineProperty(this, "_security", null);

    _defineProperty(this, "_atyp", null);

    _defineProperty(this, "_host", null);

    _defineProperty(this, "_port", null);

    _defineProperty(this, "_isConnecting", false);

    _defineProperty(this, "_staging", Buffer.alloc(0));

    _defineProperty(this, "_isHeaderSent", false);

    _defineProperty(this, "_isHeaderRecv", false);

    _defineProperty(this, "_v", null);

    _defineProperty(this, "_opt", 0x05);

    _defineProperty(this, "_dataEncKey", null);

    _defineProperty(this, "_dataEncKeyForChaCha20", null);

    _defineProperty(this, "_dataEncIV", null);

    _defineProperty(this, "_dataDecKey", null);

    _defineProperty(this, "_dataDecKeyForChaCha20", null);

    _defineProperty(this, "_dataDecIV", null);

    _defineProperty(this, "_chunkLenEncMaskGenerator", null);

    _defineProperty(this, "_chunkLenDecMaskGenerator", null);

    _defineProperty(this, "_cipherNonce", 0);

    _defineProperty(this, "_decipherNonce", 0);
  }

  static onCheckParams({
    id,
    security = 'aes-128-gcm'
  }) {
    const uuid = getUUIDBuffer(id);

    if (uuid.length !== 16) {
      throw Error('id is not a valid uuid');
    }

    const securities = Object.keys(securityTypes);

    if (!securities.includes(security)) {
      throw Error(`security must be one of ${securities}`);
    }
  }

  static async onCache({
    id
  }, store) {
    const _sodium = require('libsodium-wrappers');

    await _sodium.ready;

    if (!libsodium) {
      libsodium = _sodium;
    }

    const uuid = getUUIDBuffer(id);
    setInterval(() => V2rayVmessPreset.updateAuthCache(uuid, store), 1e3);
    V2rayVmessPreset.updateAuthCache(uuid, store);
  }

  static updateAuthCache(uuid, store) {
    const items = store.userHashCache || [];
    const now = (0, _utils.getCurrentTimestampInt)();
    let from = now - TIME_TOLERANCE;
    const to = now + TIME_TOLERANCE;
    let newItems = [];

    if (items.length !== 0) {
      const {
        timestamp: end
      } = items[items.length - 1];
      newItems = items.slice(now - end - TIME_TOLERANCE - 1);
      from = end + 1;
    }

    for (let ts = from; ts <= to; ++ts) {
      const authInfo = (0, _utils.hmac)('md5', uuid, (0, _utils.uint64ToBuffer)(ts));
      newItems.push({
        timestamp: ts,
        authInfo: authInfo
      });
    }

    store.userHashCache = newItems;
  }

  onInit({
    id,
    security = 'aes-128-gcm'
  }) {
    this._uuid = getUUIDBuffer(id);

    if (this._config.is_client) {
      this._security = securityTypes[security];
    }

    this._adBuf = new _utils.AdvancedBuffer({
      getPacketLength: this.onReceiving.bind(this)
    });

    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onInitTargetAddress({
    host,
    port
  }) {
    const type = getAddrType(host);
    this._atyp = type;
    this._port = (0, _utils.numberToBuffer)(port);
    this._host = type === ATYP_DOMAIN ? Buffer.from(host) : _ip.default.toBuffer(host);
  }

  onDestroy() {
    this._adBuf.clear();

    this._adBuf = null;
    this._host = null;
    this._port = null;
    this._staging = null;
    this._dataEncKey = null;
    this._dataEncKeyForChaCha20 = null;
    this._dataEncIV = null;
    this._dataDecKey = null;
    this._dataDecKeyForChaCha20 = null;
    this._dataDecIV = null;
    this._chunkLenEncMaskGenerator = null;
    this._chunkLenDecMaskGenerator = null;
  }

  beforeOut({
    buffer
  }) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      const header = this._config.is_client ? this.createRequestHeader() : this.createResponseHeader();
      const chunks = this.getBufferChunks(buffer);
      return Buffer.concat([header, ...chunks]);
    } else {
      const chunks = this.getBufferChunks(buffer);
      return Buffer.concat(chunks);
    }
  }

  clientIn({
    buffer,
    next,
    fail
  }) {
    if (!this._isHeaderRecv) {
      this._isHeaderRecv = true;

      const decipher = _crypto.default.createDecipheriv('aes-128-cfb', this._dataDecKey, this._dataDecIV);

      const header = decipher.update(buffer.slice(0, 4));
      const v = header[0];
      const cmdLen = header[3];

      if (this._v !== v) {
        return fail(`server response v doesn't match, expect ${this._v} but got ${v}`);
      }

      return this._adBuf.put(buffer.slice(4 + cmdLen), {
        next,
        fail
      });
    }

    this._adBuf.put(buffer, {
      next,
      fail
    });
  }

  serverIn({
    buffer,
    next,
    fail
  }) {
    if (!this._isHeaderRecv) {
      if (this._isConnecting) {
        this._staging = Buffer.concat([this._staging, buffer]);
        return;
      }

      if (buffer.length < 16) {
        return fail(`fail to parse request header: ${buffer.toString('hex')}`);
      }

      const uuid = this._uuid;
      const {
        userHashCache
      } = this.getStore();
      const authInfo = buffer.slice(0, 16);
      const cacheItem = userHashCache.find(({
        authInfo: auth
      }) => auth.equals(authInfo));

      if (cacheItem === undefined) {
        return fail(`cannot find ${authInfo.toString('hex')} in cache, maybe a wrong auth info`);
      }

      const ts = (0, _utils.uint64ToBuffer)(cacheItem.timestamp);

      const decipher = _crypto.default.createDecipheriv('aes-128-cfb', (0, _utils.hash)('md5', Buffer.concat([uuid, Buffer.from('c48619fe-8f02-49e0-b9e9-edf763e17e21')])), (0, _utils.hash)('md5', Buffer.concat([ts, ts, ts, ts])));

      const reqCommand = Buffer.from(buffer.slice(16));

      if (reqCommand.length < 41) {
        return fail(`request command is too short: ${reqCommand.length}bytes, command=${reqCommand.toString('hex')}`);
      }

      const reqHeader = decipher.update(reqCommand.slice(0, 41));
      const ver = reqHeader[0];

      if (ver !== 0x01) {
        return fail(`invalid version number: ${ver}`);
      }

      this._dataDecIV = reqHeader.slice(1, 17);
      this._dataDecKey = reqHeader.slice(17, 33);
      this._dataEncIV = (0, _utils.hash)('md5', this._dataDecIV);
      this._dataEncKey = (0, _utils.hash)('md5', this._dataDecKey);
      this._dataDecKeyForChaCha20 = createChacha20Poly1305Key(this._dataDecKey);
      this._dataEncKeyForChaCha20 = createChacha20Poly1305Key(this._dataEncKey);
      this._chunkLenDecMaskGenerator = (0, _utils.shake128)(this._dataDecIV);
      this._chunkLenEncMaskGenerator = (0, _utils.shake128)(this._dataEncIV);
      this._v = reqHeader[33];
      this._opt = reqHeader[34];
      const paddingLen = reqHeader[35] >> 4;
      const securityType = reqHeader[35] & 0x0f;
      const cmd = reqHeader[37];

      if (![0x01].includes(cmd)) {
        return fail(`unsupported cmd: ${cmd}`);
      }

      const port = reqHeader.readUInt16BE(38);
      const addrType = reqHeader[40];
      let addr = null;
      let offset = 40;

      if (addrType === ATYP_V4) {
        if (reqCommand.length < 45) {
          return fail(`request command is too short ${reqCommand.length}bytes to get ipv4, command=${reqCommand.toString('hex')}`);
        }

        addr = decipher.update(reqCommand.slice(41, 45));
        offset += 4;
      } else if (addrType === ATYP_V6) {
        if (reqCommand.length < 57) {
          return fail(`request command is too short: ${reqCommand.length}bytes to get ipv6, command=${reqCommand.toString('hex')}`);
        }

        addr = decipher.update(reqCommand.slice(41, 57));
        offset += 16;
      } else if (addrType === ATYP_DOMAIN) {
        if (reqCommand.length < 42) {
          return fail(`request command is too short: ${reqCommand.length}bytes to get host name, command=${reqCommand.toString('hex')}`);
        }

        const addrLen = decipher.update(reqCommand.slice(41, 42))[0];

        if (reqCommand.length < 42 + addrLen) {
          return fail(`request command is too short: ${reqCommand.length}bytes, command=${reqCommand.toString('hex')}`);
        }

        addr = decipher.update(reqCommand.slice(42, 42 + addrLen));
        offset += 1 + addrLen;
      } else {
        return fail(`unknown address type: ${addrType}, command=${reqHeader.toString('hex')}`);
      }

      if (reqCommand.length < offset + paddingLen + 4) {
        return fail(`request command is too short: ${reqCommand.length}bytes to get padding and f, command=${reqCommand.toString('hex')}`);
      }

      const padding = decipher.update(reqCommand.slice(offset, offset + paddingLen));
      offset += paddingLen;
      const f = decipher.update(reqCommand.slice(offset, offset + 4));
      const plainReqHeader = Buffer.from([...reqHeader.slice(0, 41), ...(addrType === ATYP_DOMAIN ? [addr.length] : []), ...addr, ...padding]);

      if ((0, _utils.fnv1a)(plainReqHeader).equals(f)) {
        return fail('fail to verify request command');
      }

      const data = buffer.slice(16 + plainReqHeader.length + 4);
      this._security = securityType;
      this._isConnecting = true;
      this.resolveTargetAddress({
        host: addrType === ATYP_DOMAIN ? addr.toString() : _ip.default.toString(addr),
        port: port
      }, () => {
        this._adBuf.put(Buffer.concat([data, this._staging]), {
          next,
          fail
        });

        this._isHeaderRecv = true;
        this._isConnecting = false;
        this._staging = null;
      });
    } else {
      this._adBuf.put(buffer, {
        next,
        fail
      });
    }
  }

  createRequestHeader() {
    const rands = _crypto.default.randomBytes(33);

    this._dataEncIV = rands.slice(0, 16);
    this._dataEncKey = rands.slice(16, 32);
    this._dataDecIV = (0, _utils.hash)('md5', this._dataEncIV);
    this._dataDecKey = (0, _utils.hash)('md5', this._dataEncKey);
    this._dataEncKeyForChaCha20 = createChacha20Poly1305Key(this._dataEncKey);
    this._dataDecKeyForChaCha20 = createChacha20Poly1305Key(this._dataDecKey);
    this._chunkLenEncMaskGenerator = (0, _utils.shake128)(this._dataEncIV);
    this._chunkLenDecMaskGenerator = (0, _utils.shake128)(this._dataDecIV);
    this._v = rands[32];
    this._opt = 0x05;
    const uuid = this._uuid;
    const {
      userHashCache
    } = this.getStore();
    const {
      timestamp,
      authInfo
    } = userHashCache[(0, _utils.getRandomInt)(0, userHashCache.length - 1)];
    const ts = (0, _utils.uint64ToBuffer)(timestamp);
    const paddingLen = (0, _utils.getRandomInt)(0, 15);

    const padding = _crypto.default.randomBytes(paddingLen);

    let command = Buffer.from([0x01, ...this._dataEncIV, ...this._dataEncKey, this._v, this._opt, paddingLen << 4 | this._security, 0x00, 0x01, ...this._port, this._atyp, ...Buffer.concat([this._atyp === ATYP_DOMAIN ? (0, _utils.numberToBuffer)(this._host.length, 1) : Buffer.alloc(0), this._host]), ...padding]);
    command = Buffer.concat([command, (0, _utils.fnv1a)(command)]);

    const cipher = _crypto.default.createCipheriv('aes-128-cfb', (0, _utils.hash)('md5', Buffer.concat([uuid, Buffer.from('c48619fe-8f02-49e0-b9e9-edf763e17e21')])), (0, _utils.hash)('md5', Buffer.concat([ts, ts, ts, ts])));

    command = cipher.update(command);
    return Buffer.concat([authInfo, command]);
  }

  createResponseHeader() {
    const cipher = _crypto.default.createCipheriv('aes-128-cfb', this._dataEncKey, this._dataEncIV);

    return cipher.update(Buffer.from([this._v, 0x01, 0x00, 0x00]));
  }

  getBufferChunks(buffer) {
    return (0, _utils.getChunks)(buffer, 0x3fff).map(chunk => {
      let _chunk = chunk;

      if ([SECURITY_TYPE_AES_128_GCM, SECURITY_TYPE_CHACHA20_POLY1305].includes(this._security)) {
        _chunk = Buffer.concat(this.encrypt(_chunk));
      }

      let _len = _chunk.length;

      if (this._opt === 0x05) {
        const mask = this._chunkLenEncMaskGenerator.nextBytes(2).readUInt16BE(0);

        _len = mask ^ _len;
      }

      return Buffer.concat([(0, _utils.numberToBuffer)(_len), _chunk]);
    });
  }

  onReceiving(buffer) {
    if (buffer.length < 2) {
      return;
    }

    let len = buffer.readUInt16BE(0);

    if (this._opt === 0x05) {
      const mask = this._chunkLenDecMaskGenerator.nextBytes(2).readUInt16BE(0);

      len = mask ^ len;
    }

    return 2 + len;
  }

  onChunkReceived(chunk, {
    next,
    fail
  }) {
    if ([SECURITY_TYPE_AES_128_GCM, SECURITY_TYPE_CHACHA20_POLY1305].includes(this._security)) {
      const tag = chunk.slice(-16);
      const data = this.decrypt(chunk.slice(2, -16), tag);

      if (data === null) {
        return fail(`fail to verify data chunk, dump=${(0, _utils.dumpHex)(chunk)}`);
      }

      return next(data);
    }

    return next(chunk.slice(2));
  }

  encrypt(plaintext) {
    const security = this._security;
    const nonce = Buffer.concat([(0, _utils.numberToBuffer)(this._cipherNonce), this._dataEncIV.slice(2, 12)]);
    let ciphertext = null;
    let tag = null;

    if (security === SECURITY_TYPE_AES_128_GCM) {
      const cipher = _crypto.default.createCipheriv('aes-128-gcm', this._dataEncKey, nonce);

      ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      tag = cipher.getAuthTag();
    } else if (security === SECURITY_TYPE_CHACHA20_POLY1305) {
      const noop = Buffer.alloc(0);
      const result = libsodium.crypto_aead_chacha20poly1305_ietf_encrypt_detached(plaintext, noop, noop, nonce, this._dataEncKeyForChaCha20);
      ciphertext = Buffer.from(result.ciphertext);
      tag = Buffer.from(result.mac);
    }

    this._cipherNonce += 1;
    return [ciphertext, tag];
  }

  decrypt(ciphertext, tag) {
    const security = this._security;
    const nonce = Buffer.concat([(0, _utils.numberToBuffer)(this._decipherNonce), this._dataDecIV.slice(2, 12)]);

    if (security === SECURITY_TYPE_AES_128_GCM) {
      const decipher = _crypto.default.createDecipheriv('aes-128-gcm', this._dataDecKey, nonce);

      decipher.setAuthTag(tag);

      try {
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        this._decipherNonce += 1;
        return plaintext;
      } catch (err) {
        return null;
      }
    } else if (security === SECURITY_TYPE_CHACHA20_POLY1305) {
      const noop = Buffer.alloc(0);

      try {
        const plaintext = libsodium.crypto_aead_chacha20poly1305_ietf_decrypt_detached(noop, ciphertext, tag, noop, nonce, this._dataDecKeyForChaCha20);
        this._decipherNonce += 1;
        return Buffer.from(plaintext);
      } catch (err) {
        return null;
      }
    }
  }

}

exports.default = V2rayVmessPreset;