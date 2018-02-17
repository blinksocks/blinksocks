import crypto from 'crypto';
import { IPreset } from './defs';
import {
  numberToBuffer,
  getCurrentTimestampInt,
  getRandomInt,
  getRandomChunks,
  AdvancedBuffer
} from '../utils';

const TLS_STAGE_HELLO = 1;
const TLS_STAGE_CHANGE_CIPHER_SPEC = 2;
const TLS_STAGE_APPLICATION_DATA = 3;

const MIN_AD_PAYLOAD_LEN = 0x0800;
const MAX_AD_PAYLOAD_LEN = 0x3FFF;

/**
 * convert string to buffer
 * @param str
 * @returns {Buffer}
 */
function stb(str) {
  return Buffer.from(str, 'hex');
}

/**
 * return UTC timestamp as buffer
 * @returns {Buffer}
 */
function getUTC() {
  return numberToBuffer(getCurrentTimestampInt(), 4);
}

/**
 * wrap buffer to Application Data
 * @param buffer
 * @returns {Buffer}
 * @constructor
 */
function ApplicationData(buffer) {
  const len = numberToBuffer(buffer.length);
  return Buffer.concat([stb('170303'), len, buffer]);
}

/**
 * @description
 *   Do TLS handshake using SessionTicket TLS mechanism, transfer data inside of Application Data.
 *
 * @params
 *   sni: Server Name Indication.
 *
 * @examples
 *   {
 *     "name": "obfs-tls1.2-ticket",
 *     "params": {
 *       "sni": ["www.bing.com"]
 *     }
 *   }
 *
 * @protocol
 *   C ---- Client Hello ---> S
 *   C <--- Server Hello, New Session Ticket, Change Cipher Spec, Finished --- S
 *   C ---- Change Cipher Spec, Finished, Application Data, Application Data, ... ---> S
 *   C <--- Application Data, Application Data, ... ---> S
 *
 * @reference
 *   [1] SNI
 *       https://en.wikipedia.org/wiki/Server_Name_Indication
 */
export default class ObfsTls12TicketPreset extends IPreset {

  _sni = [];

  _stage = TLS_STAGE_HELLO;

  _staging = Buffer.alloc(0);

  _adBuf = null;

  static onCheckParams({ sni }) {
    if (typeof sni === 'undefined') {
      throw Error('\'sni\' must be set');
    }
    if (!Array.isArray(sni)) {
      sni = [sni];
    }
    if (sni.some((s) => typeof s !== 'string' || s.length < 1)) {
      throw Error('\'sni\' must be a non-empty string or an array without empty strings');
    }
  }

  onInit({ sni }) {
    this._sni = Array.isArray(sni) ? sni : [sni];
    this._adBuf = new AdvancedBuffer({ getPacketLength: this.onReceiving.bind(this) });
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onDestroy() {
    this._adBuf.clear();
    this._adBuf = null;
    this._staging = null;
    this._sni = null;
  }

  getRandomSNI() {
    const index = crypto.randomBytes(1)[0] % this._sni.length;
    return Buffer.from(this._sni[index]);
  }

  clientOut({ buffer, next }) {
    if (this._stage === TLS_STAGE_HELLO) {
      this._stage = TLS_STAGE_CHANGE_CIPHER_SPEC;
      this._staging = buffer;
      // Send Client Hello

      const sni = this.getRandomSNI();

      // Random
      const random = [
        ...getUTC(),                 // GMT Unix Time
        ...crypto.randomBytes(28),   // Random Bytes
      ];
      // Session
      const session = [
        ...stb('20'),                // Session ID Length
        ...crypto.randomBytes(0x20), // Session ID
      ];
      // Cipher Suites
      const cipher_suites = [
        ...stb('001a'), // Cipher Suites Length
        ...stb('c02b'), // Cipher Suite: TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 (0xc02b)
        ...stb('c02f'), // Cipher Suite: TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 (0xc02f)
        ...stb('c02c'), // Cipher Suite: TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 (0xc02c)
        ...stb('c030'), // Cipher Suite: TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 (0xc030)
        ...stb('cc14'), // Cipher Suite: TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256 (0xcc14)
        ...stb('cc13'), // Cipher Suite: TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256 (0xcc13)
        ...stb('c013'), // Cipher Suite: TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA (0xc013)
        ...stb('c014'), // Cipher Suite: TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA (0xc014)
        ...stb('009c'), // Cipher Suite: TLS_RSA_WITH_AES_128_GCM_SHA256 (0x009c)
        ...stb('009d'), // Cipher Suite: TLS_RSA_WITH_AES_256_GCM_SHA384 (0x009d)
        ...stb('002f'), // Cipher Suite: TLS_RSA_WITH_AES_128_CBC_SHA (0x002f)
        ...stb('0035'), // Cipher Suite: TLS_RSA_WITH_AES_256_CBC_SHA (0x0035)
        ...stb('000a'), // Cipher Suite: TLS_RSA_WITH_3DES_EDE_CBC_SHA (0x000a)
      ];
      // Extension: server_name
      const ext_server_name = [
        ...stb('0000'),                            // Type: server_name
        ...numberToBuffer(2 + 1 + 2 + sni.length), // Length
        ...numberToBuffer(1 + 2 + sni.length),     // Server Name List length
        ...stb('00'),                              // Server Name Type: host_name(0)
        ...numberToBuffer(sni.length),             // Server Name length
        ...sni,                                    // Server Name
      ];
      // Extension: SessionTicket TLS
      const ticketLen = getRandomInt(200, 400);
      const session_ticket = [
        ...stb('0023'),                   // Type: SessionTicket TLS
        ...numberToBuffer(ticketLen),     // Length
        ...crypto.randomBytes(ticketLen), // Data
      ];
      // Extensions
      const exts = [
        ...stb('ff01000100'),                                       // Extension: renegotiation_info
        ...ext_server_name,                                         // Extension: server_name
        ...stb('00170000'),                                         // Extension: Extended Master Secret
        ...session_ticket,                                          // Extension: SessionTicket TLS
        ...stb('000d00140012040308040401050308050501080606010201'), // Extension: signature_algorithms
        ...stb('000500050100000000'),                               // Extension: status_request
        ...stb('00120000'),                                         // Extension: signed_certificate_timestamp
        ...stb('75500000'),                                         // Extension: channel_id
        ...stb('000b00020100'),                                     // Extension: ec_point_formats
        ...stb('000a0006000400170018')                              // Extension: elliptic_curves
      ];

      const body = [
        ...stb('0303'),                 // Version: TLS 1.2
        ...random,                      // Random
        ...session,                     // Session
        ...cipher_suites,               // Cipher Suites
        ...stb('01'),                   // Compression Methods Length
        ...stb('00'),                   // Compression Methods = [null]
        ...numberToBuffer(exts.length), // Extension Length
        ...exts                         // Extensions
      ];
      const header = [
        ...stb('16'),                           // Content Type: Handshake
        ...stb('0301'),                         // Version: TLS 1.0
        ...numberToBuffer(1 + 3 + body.length), // Length
        ...stb('01'),                           // Handshake Type: ClientHello
        ...numberToBuffer(body.length, 3)       // Length
      ];
      return next(Buffer.from([...header, ...body]));
    }

    if (this._stage === TLS_STAGE_CHANGE_CIPHER_SPEC) {
      this._staging = Buffer.concat([this._staging, buffer]);
    }

    if (this._stage === TLS_STAGE_APPLICATION_DATA) {
      // Send Application Data
      const chunks = getRandomChunks(buffer, MIN_AD_PAYLOAD_LEN, MAX_AD_PAYLOAD_LEN)
        .map((chunk) => ApplicationData(chunk));
      return Buffer.concat(chunks);
    }
  }

  serverIn({ buffer, next, fail }) {
    if (this._stage === TLS_STAGE_HELLO) {
      this._stage = TLS_STAGE_CHANGE_CIPHER_SPEC;

      // 1. Check Client Hello

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

      // 2. Send Server Hello, New Session Ticket, Change Cipher Spec, Finished

      // [Server Hello]

      // Random
      const random = [
        ...getUTC(),               // GMT Unix Time
        ...crypto.randomBytes(28), // Random Bytes
      ];
      // Session
      const session = [
        ...stb('20'),                // Session ID Length
        ...crypto.randomBytes(0x20), // Session ID
      ];
      // Extensions
      const exts = [
        ...stb('ff01000100'), // Extension: renegotiation_info
        ...stb('00050000'),   // Extension: status_request
        ...stb('00170000')    // Extension: Extended Master Secret
      ];

      const body = [
        ...stb('0303'),                 // Version: TLS 1.2
        ...random,                      // Random
        ...session,                     // Session
        ...stb('c02f'),                 // Cipher Suite
        ...stb('00'),                   // Compression Method
        ...numberToBuffer(exts.length), // Extension Length
        ...exts                         // Extensions
      ];

      const header = [
        ...stb('16'),                           // Content Type: Handshake
        ...stb('0303'),                         // Version: TLS 1.2
        ...numberToBuffer(1 + 3 + body.length), // Length
        ...stb('02'),                           // Handshake Type: Server Hello
        ...numberToBuffer(body.length, 3)       // Length
      ];

      const server_hello = [...header, ...body];

      // [New Session Ticket]
      const ticket = crypto.randomBytes(getRandomInt(200, 255));
      const session_ticket = [
        ...stb('000004b0'),               // Session Ticket Lifetime Hint: 1200 sec, 32-bit unsigned integer in network byte order
        ...numberToBuffer(ticket.length), // Session Ticket Length
        ...ticket                         // Session Ticket
      ];
      const new_session_ticket_body = [
        ...stb('04'),                                // New Session Ticket
        ...numberToBuffer(session_ticket.length, 3), // New Session Ticket Length, 3 bytes
        ...session_ticket
      ];
      const new_session_ticket = [
        ...stb('160303'),
        ...numberToBuffer(new_session_ticket_body.length), // Length
        ...new_session_ticket_body
      ];

      // [Change Cipher Spec]
      const change_cipher_spec = [
        ...stb('140303000101')
      ];

      // [Finished]
      const finishedLen = getRandomInt(32, 40);
      const finished = [
        ...stb('16'),                   // Content Type: Handshake
        ...stb('0303'),                 // Version: TLS 1.2
        ...numberToBuffer(finishedLen), // Length
        ...crypto.randomBytes(finishedLen)
      ];

      return next(Buffer.from([...server_hello, ...new_session_ticket, ...change_cipher_spec, ...finished]), true);
    }

    let _buffer = buffer;

    if (this._stage === TLS_STAGE_CHANGE_CIPHER_SPEC) {
      this._stage = TLS_STAGE_APPLICATION_DATA;
      // TODO: 1. Check Client Change Cipher Spec

      // 2. Drop Client Change Cipher Spec
      _buffer = buffer.slice(43);
    }

    this._adBuf.put(_buffer, { next, fail });
  }

  serverOut({ buffer }) {
    // Send Application Data
    const chunks = getRandomChunks(buffer, MIN_AD_PAYLOAD_LEN, MAX_AD_PAYLOAD_LEN)
      .map((chunk) => ApplicationData(chunk));
    return Buffer.concat(chunks);
  }

  clientIn({ buffer, next, fail }) {
    if (this._stage === TLS_STAGE_CHANGE_CIPHER_SPEC) {
      this._stage = TLS_STAGE_APPLICATION_DATA;
      // TODO: 1. Check Server Hello

      // 2. Send Change Cipher Spec(43 bytes fixed) and Pending Data

      // Change Cipher Spec
      const change_cipher_spec = [
        ...stb('140303000101')
      ];
      // Finished
      const finished = [
        ...stb('16'),   // Content Type: Handshake
        ...stb('0303'), // Version: TLS 1.2
        ...stb('0020'), // Length: 32
        ...crypto.randomBytes(0x20),
      ];
      // Application Data
      const chunks = getRandomChunks(this._staging, MIN_AD_PAYLOAD_LEN, MAX_AD_PAYLOAD_LEN)
        .map((chunk) => ApplicationData(chunk));
      this._staging = null;
      return next(Buffer.from([...change_cipher_spec, ...finished, ...Buffer.concat(chunks)]), true);
    }
    this._adBuf.put(buffer, { next, fail });
  }

  onReceiving(buffer) {
    if (buffer.length < 5) {
      // fail(`Application Data is too short: ${buffer.length} bytes, ${buffer.toString('hex')}`);
      return;
    }
    return 5 + buffer.readUInt16BE(3);
  }

  onChunkReceived(chunk, { next }) {
    // Drop TLS Application Data header
    next(chunk.slice(5));
  }

}
