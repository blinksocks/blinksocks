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

const TLS_STAGE_HELLO = 1;
const TLS_STAGE_CHANGE_CIPHER_SPEC = 2;
const TLS_STAGE_APPLICATION_DATA = 3;
const MIN_AD_PAYLOAD_LEN = 0x0800;
const MAX_AD_PAYLOAD_LEN = 0x3FFF;

function stb(str) {
  return Buffer.from(str, 'hex');
}

function getUTC() {
  return (0, _utils.numberToBuffer)((0, _utils.getCurrentTimestampInt)(), 4);
}

function ApplicationData(buffer) {
  const len = (0, _utils.numberToBuffer)(buffer.length);
  return Buffer.concat([stb('170303'), len, buffer]);
}

class ObfsTls12TicketPreset extends _defs.IPreset {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_sni", []);

    _defineProperty(this, "_stage", TLS_STAGE_HELLO);

    _defineProperty(this, "_staging", Buffer.alloc(0));

    _defineProperty(this, "_adBuf", null);
  }

  static onCheckParams({
    sni
  }) {
    if (typeof sni === 'undefined') {
      throw Error('\'sni\' must be set');
    }

    if (!Array.isArray(sni)) {
      sni = [sni];
    }

    if (sni.some(s => typeof s !== 'string' || s.length < 1)) {
      throw Error('\'sni\' must be a non-empty string or an array without empty strings');
    }
  }

  onInit({
    sni
  }) {
    this._sni = Array.isArray(sni) ? sni : [sni];
    this._adBuf = new _utils.AdvancedBuffer({
      getPacketLength: this.onReceiving.bind(this)
    });

    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onDestroy() {
    this._adBuf.clear();

    this._adBuf = null;
    this._staging = null;
    this._sni = null;
  }

  getRandomSNI() {
    const index = _crypto.default.randomBytes(1)[0] % this._sni.length;

    return Buffer.from(this._sni[index]);
  }

  clientOut({
    buffer,
    next
  }) {
    if (this._stage === TLS_STAGE_HELLO) {
      this._stage = TLS_STAGE_CHANGE_CIPHER_SPEC;
      this._staging = buffer;
      const sni = this.getRandomSNI();
      const random = [...getUTC(), ..._crypto.default.randomBytes(28)];
      const session = [...stb('20'), ..._crypto.default.randomBytes(0x20)];
      const cipher_suites = [...stb('001a'), ...stb('c02b'), ...stb('c02f'), ...stb('c02c'), ...stb('c030'), ...stb('cc14'), ...stb('cc13'), ...stb('c013'), ...stb('c014'), ...stb('009c'), ...stb('009d'), ...stb('002f'), ...stb('0035'), ...stb('000a')];
      const ext_server_name = [...stb('0000'), ...(0, _utils.numberToBuffer)(2 + 1 + 2 + sni.length), ...(0, _utils.numberToBuffer)(1 + 2 + sni.length), ...stb('00'), ...(0, _utils.numberToBuffer)(sni.length), ...sni];
      const ticketLen = (0, _utils.getRandomInt)(200, 400);
      const session_ticket = [...stb('0023'), ...(0, _utils.numberToBuffer)(ticketLen), ..._crypto.default.randomBytes(ticketLen)];
      const exts = [...stb('ff01000100'), ...ext_server_name, ...stb('00170000'), ...session_ticket, ...stb('000d00140012040308040401050308050501080606010201'), ...stb('000500050100000000'), ...stb('00120000'), ...stb('75500000'), ...stb('000b00020100'), ...stb('000a0006000400170018')];
      const body = [...stb('0303'), ...random, ...session, ...cipher_suites, ...stb('01'), ...stb('00'), ...(0, _utils.numberToBuffer)(exts.length), ...exts];
      const header = [...stb('16'), ...stb('0301'), ...(0, _utils.numberToBuffer)(1 + 3 + body.length), ...stb('01'), ...(0, _utils.numberToBuffer)(body.length, 3)];
      return next(Buffer.from([...header, ...body]));
    }

    if (this._stage === TLS_STAGE_CHANGE_CIPHER_SPEC) {
      this._staging = Buffer.concat([this._staging, buffer]);
    }

    if (this._stage === TLS_STAGE_APPLICATION_DATA) {
      const chunks = (0, _utils.getRandomChunks)(buffer, MIN_AD_PAYLOAD_LEN, MAX_AD_PAYLOAD_LEN).map(chunk => ApplicationData(chunk));
      return Buffer.concat(chunks);
    }
  }

  serverIn({
    buffer,
    next,
    fail
  }) {
    if (this._stage === TLS_STAGE_HELLO) {
      this._stage = TLS_STAGE_CHANGE_CIPHER_SPEC;

      if (buffer.length < 200) {
        fail(`TLS handshake header is too short, length=${buffer.length} dump=${buffer.slice(0, 100).toString('hex')}`);
        return;
      }

      if (!buffer.slice(0, 3).equals(stb('160301'))) {
        fail(`invalid TLS handshake header=${buffer.slice(0, 3).toString('hex')}, want=160301, dump=${buffer.slice(0, 100).toString('hex')}`);
        return;
      }

      const tlsLen = buffer.slice(3, 5).readUInt16BE(0);

      if (tlsLen !== buffer.length - 5) {
        fail(`unexpected TLS handshake body length=${buffer.length - 5}, want=${tlsLen}, dump=${buffer.slice(0, 100).toString('hex')}`);
        return;
      }

      const random = [...getUTC(), ..._crypto.default.randomBytes(28)];
      const session = [...stb('20'), ..._crypto.default.randomBytes(0x20)];
      const exts = [...stb('ff01000100'), ...stb('00050000'), ...stb('00170000')];
      const body = [...stb('0303'), ...random, ...session, ...stb('c02f'), ...stb('00'), ...(0, _utils.numberToBuffer)(exts.length), ...exts];
      const header = [...stb('16'), ...stb('0303'), ...(0, _utils.numberToBuffer)(1 + 3 + body.length), ...stb('02'), ...(0, _utils.numberToBuffer)(body.length, 3)];
      const server_hello = [...header, ...body];

      const ticket = _crypto.default.randomBytes((0, _utils.getRandomInt)(200, 255));

      const session_ticket = [...stb('000004b0'), ...(0, _utils.numberToBuffer)(ticket.length), ...ticket];
      const new_session_ticket_body = [...stb('04'), ...(0, _utils.numberToBuffer)(session_ticket.length, 3), ...session_ticket];
      const new_session_ticket = [...stb('160303'), ...(0, _utils.numberToBuffer)(new_session_ticket_body.length), ...new_session_ticket_body];
      const change_cipher_spec = [...stb('140303000101')];
      const finishedLen = (0, _utils.getRandomInt)(32, 40);
      const finished = [...stb('16'), ...stb('0303'), ...(0, _utils.numberToBuffer)(finishedLen), ..._crypto.default.randomBytes(finishedLen)];
      return next(Buffer.from([...server_hello, ...new_session_ticket, ...change_cipher_spec, ...finished]), true);
    }

    let _buffer = buffer;

    if (this._stage === TLS_STAGE_CHANGE_CIPHER_SPEC) {
      this._stage = TLS_STAGE_APPLICATION_DATA;
      _buffer = buffer.slice(43);
    }

    this._adBuf.put(_buffer, {
      next,
      fail
    });
  }

  serverOut({
    buffer
  }) {
    const chunks = (0, _utils.getRandomChunks)(buffer, MIN_AD_PAYLOAD_LEN, MAX_AD_PAYLOAD_LEN).map(chunk => ApplicationData(chunk));
    return Buffer.concat(chunks);
  }

  clientIn({
    buffer,
    next,
    fail
  }) {
    if (this._stage === TLS_STAGE_CHANGE_CIPHER_SPEC) {
      this._stage = TLS_STAGE_APPLICATION_DATA;
      const change_cipher_spec = [...stb('140303000101')];
      const finished = [...stb('16'), ...stb('0303'), ...stb('0020'), ..._crypto.default.randomBytes(0x20)];
      const chunks = (0, _utils.getRandomChunks)(this._staging, MIN_AD_PAYLOAD_LEN, MAX_AD_PAYLOAD_LEN).map(chunk => ApplicationData(chunk));
      this._staging = null;
      return next(Buffer.from([...change_cipher_spec, ...finished, ...Buffer.concat(chunks)]), true);
    }

    this._adBuf.put(buffer, {
      next,
      fail
    });
  }

  onReceiving(buffer) {
    if (buffer.length < 5) {
      return;
    }

    return 5 + buffer.readUInt16BE(3);
  }

  onChunkReceived(chunk, {
    next
  }) {
    next(chunk.slice(5));
  }

}

exports.default = ObfsTls12TicketPreset;