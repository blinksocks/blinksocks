import net from 'net';
import crypto from 'crypto';
import ip from 'ip';
import { IPresetAddressing } from './defs';
import {
  hmac,
  hash,
  shake128,
  fnv1a,
  dumpHex,
  uint64ToBuffer,
  getRandomInt,
  getChunks,
  getCurrentTimestampInt,
  numberToBuffer as ntb,
  AdvancedBuffer,
} from '../utils';

const ATYP_V4 = 0x01;
const ATYP_DOMAIN = 0x02;
const ATYP_V6 = 0x03;
const TIME_TOLERANCE = 30;

function getAddrType(host) {
  if (net.isIPv4(host)) {
    return ATYP_V4;
  }
  if (net.isIPv6(host)) {
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
  'none': SECURITY_TYPE_NONE,
};

let libsodium = null;

function createChacha20Poly1305Key(key) {
  const md5Key = hash('md5', key);
  return Buffer.concat([md5Key, hash('md5', md5Key)]);
}

/**
 * convert uuid string to buffer
 * @param id
 * @returns {Buffer}
 */
function getUUIDBuffer(id) {
  return Buffer.from(id.split('-').join(''), 'hex');
}

/**
 * @description
 *   v2ray vmess protocol implementation.
 *
 * @params
 *   id: client uuid.
 *   security(optional): encryption method, client only, "aes-128-gcm"(default) or "none".
 *
 * @examples
 *   {
 *     "name": "v2ray-vmess",
 *     "params": {
 *       "id": "a3482e88-686a-4a58-8126-99c9df64b7bf",
 *       "security": "aes-128-gcm"
 *     }
 *   }
 *
 * @protocols
 *
 *   # Client Request
 *   +----------+-------------+---------------+
 *   | AuthInfo |   Command   |  Data Chunks  |
 *   +----------+-------------+---------------+
 *   |    16    |  Variable   |   Variable    |
 *   +----------+-------------+---------------+
 *
 *   AuthInfo = HMAC("md5", UUID, UTC)
 *
 *   # Command
 *   +-----+------+-------+-----+-----+------+------+-----+-----+------+-----+------------+------------+-----+
 *   | Ver |  IV  |  Key  |  V  | Opt | PLen | Sec  | RSV | Cmd | Port |  T  |    Addr    |  Padding   |  F  |
 *   +-----+------+-------+-----+-----+------+------+-----+-----+------+-----+------------+------------+-----+
 *   |  1  |  16  |  16   |  1  |  1  | 4bit | 4bit |  1  |  1  |  2   |  1  |  Variable  |  Variable  |  4  |
 *   +-----+------+-------+-----+-----+------+------+-----+-----+------+-----+------------+------------+-----+
 *
 *   Ver = 0x01
 *   IV  = rand(16), Key = rand(16), V = rand(1)
 *   Opt = 0x05
 *     0x01: standard data stream
 *     0x02: reuse TCP connection(- deprecated -)
 *     0x03: metadata obfuscate
 *   PLen = 0~15
 *   Sec
 *     0x00 aes-128-cfb(- deprecated -)
 *     0x03 aes-128-gcm
 *     0x04 chacha20-poly1305(not support)
 *     0x05 none
 *   RSV = 0x00
 *   Cmd = 0x01
 *     0x01 TCP
 *     0x02 UDP(not support)
 *   Port: Big-Endian
 *   T
 *     0x01: ipv4
 *     0x02: hostname
 *     0x03: ipv6
 *   Addr
 *     T=0x01: [ip4v], 4 bytes
 *     T=0x02: [len,hostname]
 *     T=0x03: [ipv6], 16 bytes
 *   Padding = rand(PLen)
 *   F = fnv1a(all the above)
 *
 *   # Data Chunk
 *   +-----------+------------+
 *   |  DataLen  |    Data    |
 *   +-----------+------------+
 *   |     2     |  Variable  |
 *   +-----------+------------+
 *
 *   DataLen: Big-Endian, 0 ~ 0x3FFF
 *
 *   # Data(when using "aes-128-gcm")
 *   +-----------+---------+
 *   |  Payload  |   Tag   |
 *   +-----------+---------+
 *   |  Variable |   16    |
 *   +-----------+---------+
 *
 *   # Data(when using "none")
 *   +-----------+
 *   |  Payload  |
 *   +-----------+
 *   |  Variable |
 *   +-----------+
 *
 *   # Server Response
 *   +-----+-----+-----+----------+---------+-------------+
 *   |  V  | Opt | Cmd |  CmdLen  | CmdData | Data Chunks |
 *   +-----+-----+-----+----------+---------+-------------+
 *   |  1  |  1  |  1  |    1     |  Fixed  |  Variable   |
 *   +-----+-----+-----+----------+---------+-------------+
 *
 *   V = Request V
 *   Opt
 *     0x01: reuse TCP connection(- deprecated -)
 *   Cmd
 *     0x01: dynamic port(not support)
 *   Data Chunks: see above
 *
 *  @notice
 *    1. "Opt" of client request is always 0x05.
 *    2. "alterId" of vmess client must be the default(0).
 *    3. "mux" of vmess client must be disabled.
 *    4. client UDP relay(CMD = 0x02, typically DNS requests) will be dropped.
 *    5. dynamic port is not implemented yet.
 *
 *  @reference
 *    [1] VMess Spec
 *        https://www.v2ray.com/chapter_04/03_vmess.html
 *    [2] VMess Config
 *        https://www.v2ray.com/chapter_02/protocols/vmess.html
 */
export default class V2rayVmessPreset extends IPresetAddressing {

  _uuid = null;
  _security = null;

  _atyp = null;
  _host = null; // buffer
  _port = null; // buffer

  _isConnecting = false;
  _staging = Buffer.alloc(0);

  _isHeaderSent = false;
  _isHeaderRecv = false;

  _v = null;
  _opt = 0x05; // 0x01(S) or 0x05(S+M)
  _dataEncKey = null;
  _dataEncKeyForChaCha20 = null;
  _dataEncIV = null;
  _dataDecKey = null;
  _dataDecKeyForChaCha20 = null;
  _dataDecIV = null;
  _chunkLenEncMaskGenerator = null;
  _chunkLenDecMaskGenerator = null;

  // nonce counter
  _cipherNonce = 0;
  _decipherNonce = 0;

  static onCheckParams({ id, security = 'aes-128-gcm' }) {
    const uuid = getUUIDBuffer(id);
    if (uuid.length !== 16) {
      throw Error('id is not a valid uuid');
    }
    const securities = Object.keys(securityTypes);
    if (!securities.includes(security)) {
      throw Error(`security must be one of ${securities}`);
    }
  }

  static async onCache({ id }, store) {
    // libsodium-wrappers need to be loaded asynchronously
    // so we must wait for it ready before run our service.
    // Ref: https://github.com/jedisct1/libsodium.js#usage-as-a-module
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
    const items = store.userHashCache || [
      // {timestamp, authInfo},
      // ...
    ];
    const now = getCurrentTimestampInt();
    let from = now - TIME_TOLERANCE;
    const to = now + TIME_TOLERANCE;
    let newItems = [];
    if (items.length !== 0) {
      const { timestamp: end } = items[items.length - 1];
      newItems = items.slice(now - end - TIME_TOLERANCE - 1);
      from = end + 1;
    }
    for (let ts = from; ts <= to; ++ts) {
      // account auth info, 16 bytes
      const authInfo = hmac('md5', uuid, uint64ToBuffer(ts));
      newItems.push({ timestamp: ts, authInfo: authInfo });
    }
    store.userHashCache = newItems;
  }

  onInit({ id, security = 'aes-128-gcm' }) {
    this._uuid = getUUIDBuffer(id);
    if (this._config.is_client) {
      this._security = securityTypes[security];
    }
    this._adBuf = new AdvancedBuffer({ getPacketLength: this.onReceiving.bind(this) });
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onInitTargetAddress({ host, port }) {
    const type = getAddrType(host);
    this._atyp = type;
    this._port = ntb(port);
    this._host = (type === ATYP_DOMAIN) ? Buffer.from(host) : ip.toBuffer(host);
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

  beforeOut({ buffer }) {
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

  clientIn({ buffer, next, fail }) {
    if (!this._isHeaderRecv) {
      this._isHeaderRecv = true;
      const decipher = crypto.createDecipheriv('aes-128-cfb', this._dataDecKey, this._dataDecIV);
      const header = decipher.update(buffer.slice(0, 4));
      const v = header[0];
      // const opt = header[1];
      // const cmd = header[2];
      const cmdLen = header[3];
      if (this._v !== v) {
        return fail(`server response v doesn't match, expect ${this._v} but got ${v}`);
      }
      return this._adBuf.put(buffer.slice(4 + cmdLen)/* drop command */, { next, fail });
    }
    this._adBuf.put(buffer, { next, fail });
  }

  serverIn({ buffer, next, fail }) {
    if (!this._isHeaderRecv) {

      if (this._isConnecting) {
        this._staging = Buffer.concat([this._staging, buffer]);
        return;
      }

      if (buffer.length < 16) {
        return fail(`fail to parse request header: ${buffer.toString('hex')}`);
      }

      const uuid = this._uuid;
      const { userHashCache } = this.getStore();

      // verify auth info
      const authInfo = buffer.slice(0, 16);
      const cacheItem = userHashCache.find(({ authInfo: auth }) => auth.equals(authInfo));
      if (cacheItem === undefined) {
        return fail(`cannot find ${authInfo.toString('hex')} in cache, maybe a wrong auth info`);
      }

      // decrypt request header
      const ts = uint64ToBuffer(cacheItem.timestamp);
      const decipher = crypto.createDecipheriv(
        'aes-128-cfb',
        hash('md5', Buffer.concat([uuid, Buffer.from('c48619fe-8f02-49e0-b9e9-edf763e17e21')])),
        hash('md5', Buffer.concat([ts, ts, ts, ts])),
      );
      const reqCommand = Buffer.from(buffer.slice(16));
      if (reqCommand.length < 41) {
        return fail(`request command is too short: ${reqCommand.length}bytes, command=${reqCommand.toString('hex')}`);
      }

      // decrypt the leading 41 bytes
      const reqHeader = decipher.update(reqCommand.slice(0, 41));

      // verify version number
      const ver = reqHeader[0];
      if (ver !== 0x01) {
        return fail(`invalid version number: ${ver}`);
      }

      this._dataDecIV = reqHeader.slice(1, 17);
      this._dataDecKey = reqHeader.slice(17, 33);
      this._dataEncIV = hash('md5', this._dataDecIV);
      this._dataEncKey = hash('md5', this._dataDecKey);

      this._dataDecKeyForChaCha20 = createChacha20Poly1305Key(this._dataDecKey);
      this._dataEncKeyForChaCha20 = createChacha20Poly1305Key(this._dataEncKey);

      this._chunkLenDecMaskGenerator = shake128(this._dataDecIV);
      this._chunkLenEncMaskGenerator = shake128(this._dataEncIV);

      this._v = reqHeader[33];
      this._opt = reqHeader[34];

      const paddingLen = reqHeader[35] >> 4;
      const securityType = reqHeader[35] & 0x0f;
      // const rsv = reqHeader[36];

      const cmd = reqHeader[37];
      if (![0x01/* tcp, 0x02 udp */].includes(cmd)) {
        return fail(`unsupported cmd: ${cmd}`);
      }
      const port = reqHeader.readUInt16BE(38);

      // addressing
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

      // padding and F
      const padding = decipher.update(reqCommand.slice(offset, offset + paddingLen));
      offset += paddingLen;
      const f = decipher.update(reqCommand.slice(offset, offset + 4));

      // verify F
      const plainReqHeader = Buffer.from([
        ...reqHeader.slice(0, 41),
        ...(addrType === ATYP_DOMAIN ? [addr.length] : []), ...addr,
        ...padding,
      ]);
      if (fnv1a(plainReqHeader).equals(f)) {
        return fail('fail to verify request command');
      }
      const data = buffer.slice(16 + plainReqHeader.length + 4);
      this._security = securityType;

      this._isConnecting = true;
      this.resolveTargetAddress({
        host: addrType === ATYP_DOMAIN ? addr.toString() : ip.toString(addr),
        port: port,
      }, () => {
        this._adBuf.put(Buffer.concat([data, this._staging]), { next, fail });
        this._isHeaderRecv = true;
        this._isConnecting = false;
        this._staging = null;
      });
    } else {
      this._adBuf.put(buffer, { next, fail });
    }
  }

  createRequestHeader() {
    const rands = crypto.randomBytes(33);

    // IV and Key for data chunks encryption/decryption
    this._dataEncIV = rands.slice(0, 16);
    this._dataEncKey = rands.slice(16, 32);
    this._dataDecIV = hash('md5', this._dataEncIV);
    this._dataDecKey = hash('md5', this._dataEncKey);

    this._dataEncKeyForChaCha20 = createChacha20Poly1305Key(this._dataEncKey);
    this._dataDecKeyForChaCha20 = createChacha20Poly1305Key(this._dataDecKey);

    this._chunkLenEncMaskGenerator = shake128(this._dataEncIV);
    this._chunkLenDecMaskGenerator = shake128(this._dataDecIV);

    this._v = rands[32];
    this._opt = 0x05;

    const uuid = this._uuid;
    const { userHashCache } = this.getStore();

    const { timestamp, authInfo } = userHashCache[getRandomInt(0, userHashCache.length - 1)];

    // utc timestamp: Big-Endian, 8 bytes
    const ts = uint64ToBuffer(timestamp);

    const paddingLen = getRandomInt(0, 15);
    const padding = crypto.randomBytes(paddingLen);

    // create encrypted command
    let command = Buffer.from([
      0x01, // Ver
      ...this._dataEncIV, ...this._dataEncKey, this._v, this._opt,
      paddingLen << 4 | this._security,
      0x00, // RSV
      0x01, // Cmd
      ...this._port, this._atyp,
      ...Buffer.concat([
        (this._atyp === ATYP_DOMAIN) ? ntb(this._host.length, 1) : Buffer.alloc(0),
        this._host,
      ]),
      ...padding,
    ]);
    command = Buffer.concat([command, fnv1a(command)]);
    const cipher = crypto.createCipheriv(
      'aes-128-cfb',
      hash('md5', Buffer.concat([uuid, Buffer.from('c48619fe-8f02-49e0-b9e9-edf763e17e21')])),
      hash('md5', Buffer.concat([ts, ts, ts, ts])),
    );
    command = cipher.update(command);
    return Buffer.concat([authInfo, command]);
  }

  createResponseHeader() {
    const cipher = crypto.createCipheriv('aes-128-cfb', this._dataEncKey, this._dataEncIV);
    return cipher.update(Buffer.from([this._v, 0x01, 0x00, 0x00]));
  }

  getBufferChunks(buffer) {
    return getChunks(buffer, 0x3fff).map((chunk) => {
      let _chunk = chunk;
      if ([SECURITY_TYPE_AES_128_GCM, SECURITY_TYPE_CHACHA20_POLY1305].includes(this._security)) {
        _chunk = Buffer.concat(this.encrypt(_chunk));
      }
      let _len = _chunk.length;
      if (this._opt === 0x05) {
        const mask = this._chunkLenEncMaskGenerator.nextBytes(2).readUInt16BE(0);
        _len = mask ^ _len;
      }
      return Buffer.concat([ntb(_len), _chunk]);
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

  onChunkReceived(chunk, { next, fail }) {
    if ([SECURITY_TYPE_AES_128_GCM, SECURITY_TYPE_CHACHA20_POLY1305].includes(this._security)) {
      const tag = chunk.slice(-16);
      const data = this.decrypt(chunk.slice(2, -16), tag);
      if (data === null) {
        return fail(`fail to verify data chunk, dump=${dumpHex(chunk)}`);
      }
      return next(data);
    }
    return next(chunk.slice(2));
  }

  encrypt(plaintext) {
    const security = this._security;
    const nonce = Buffer.concat([ntb(this._cipherNonce), this._dataEncIV.slice(2, 12)]);
    let ciphertext = null;
    let tag = null;
    if (security === SECURITY_TYPE_AES_128_GCM) {
      const cipher = crypto.createCipheriv('aes-128-gcm', this._dataEncKey, nonce);
      ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      tag = cipher.getAuthTag();
    }
    else if (security === SECURITY_TYPE_CHACHA20_POLY1305) {
      const noop = Buffer.alloc(0);
      // eslint-disable-next-line
      const result = libsodium.crypto_aead_chacha20poly1305_ietf_encrypt_detached(
        plaintext, noop, noop, nonce, this._dataEncKeyForChaCha20,
      );
      ciphertext = Buffer.from(result.ciphertext);
      tag = Buffer.from(result.mac);
    }
    this._cipherNonce += 1;
    return [ciphertext, tag];
  }

  decrypt(ciphertext, tag) {
    const security = this._security;
    const nonce = Buffer.concat([ntb(this._decipherNonce), this._dataDecIV.slice(2, 12)]);
    if (security === SECURITY_TYPE_AES_128_GCM) {
      const decipher = crypto.createDecipheriv('aes-128-gcm', this._dataDecKey, nonce);
      decipher.setAuthTag(tag);
      try {
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        this._decipherNonce += 1;
        return plaintext;
      } catch (err) {
        return null;
      }
    }
    else if (security === SECURITY_TYPE_CHACHA20_POLY1305) {
      const noop = Buffer.alloc(0);
      try {
        // eslint-disable-next-line
        const plaintext = libsodium.crypto_aead_chacha20poly1305_ietf_decrypt_detached(
          noop, ciphertext, tag, noop, nonce, this._dataDecKeyForChaCha20,
        );
        this._decipherNonce += 1;
        return Buffer.from(plaintext);
      } catch (err) {
        return null;
      }
    }
  }

}
