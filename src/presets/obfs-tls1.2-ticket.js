import crypto from 'crypto';
import {IPreset} from './defs';
import {Utils} from '../utils';

function getUTC() {
  const ts = Math.floor((new Date()).getTime() / 1e3);
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(ts, 0);
  return buf.toJSON().data;
}

function stb(str) {
  return Buffer.from(str, 'hex');
}

const TLS_STAGE_HELLO = 1;
const TLS_STAGE_CHANGE_CIPHER_SPEC = 2;
const TLS_STAGE_APPLICATION_DATA = 3;

export default class ObfsTLS12TicketPreset extends IPreset {

  _sni = null;

  _stage = TLS_STAGE_HELLO;

  _pending = null;

  constructor({sni}) {
    super();
    this._sni = Buffer.from(sni);
  }

  clientOut({buffer, next}) {
    if (this._stage === TLS_STAGE_HELLO) {
      this._stage = TLS_STAGE_CHANGE_CIPHER_SPEC;
      this._pending = buffer;
      // extensions
      const ticketLen = crypto.randomBytes(1).readUInt8(0);
      const exts = [
        // Extension: renegotiation_info
        stb('ff01000100'),

        // Extension: server_name
        stb('0000'), // Type: server_name
        Utils.numberToUInt(2 + 1 + 2 + this._sni.length), // Length
        Utils.numberToUInt(1 + 2 + this._sni.length),     // Server Name List length
        stb('00'),                                        // Server Name Type: host_name(0)
        Utils.numberToUInt(this._sni.length),             // Server Name length
        this._sni,                                        // Server Name

        // Extension: Extended Master Secret
        stb('00170000'),

        // Extension: SessionTicket TLS
        stb('0023'),    // Type: SessionTicket TLS
        Utils.numberToUInt(ticketLen), // Length
        crypto.randomBytes(ticketLen), // Data

        // Extension: signature_algorithms
        stb('000d00140012040308040401050308050501080606010201'),
        // Extension: status_request
        stb('000500050100000000'),
        // Extension: signed_certificate_timestamp
        stb('00120000'),
        // Extension: channel_id
        stb('75500000'),
        // Extension: ec_point_formats
        stb('000b00020100'),
        // Extension: elliptic_curves
        stb('000a0006000400170018')
      ];
      const body = [
        stb('0303'),                // Version: TLS 1.2
        getUTC(),                   // GMT Unix Time
        crypto.randomBytes(28),     // Random Bytes
        stb('20'),                  // Session ID Length
        crypto.randomBytes(0x20),   // Session ID

        stb('000a'), // Cipher Suites Length
        stb('c02b'), // Cipher Suite: TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 (0xc02b)
        stb('c02f'), // Cipher Suite: TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 (0xc02f)
        stb('c02c'), // Cipher Suite: TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 (0xc02c)
        stb('c030'), // Cipher Suite: TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 (0xc030)
        stb('cc14'), // Cipher Suite: TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256 (0xcc14)
        stb('cc13'), // Cipher Suite: TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256 (0xcc13)
        stb('c013'), // Cipher Suite: TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA (0xc013)
        stb('c014'), // Cipher Suite: TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA (0xc014)
        stb('009c'), // Cipher Suite: TLS_RSA_WITH_AES_128_GCM_SHA256 (0x009c)
        stb('009d'), // Cipher Suite: TLS_RSA_WITH_AES_256_GCM_SHA384 (0x009d)
        stb('002f'), // Cipher Suite: TLS_RSA_WITH_AES_128_CBC_SHA (0x002f)
        stb('0035'), // Cipher Suite: TLS_RSA_WITH_AES_256_CBC_SHA (0x0035)
        stb('000a'), // Cipher Suite: TLS_RSA_WITH_3DES_EDE_CBC_SHA (0x000a)

        stb('01'), // Compression Methods Length
        stb('00'), // Compression Methods = [null]

        Utils.numberToUInt(exts.length), // Extension Length
        ...exts                          // Extensions
      ];
      const header = [
        stb('16'),                               // Content Type: Handshake
        stb('0301'),                             // Version: TLS 1.0
        Utils.numberToUInt(1 + 3 + body.length), // Length
        stb('01'),                               // Handshake Type: ClientHello
        Utils.numberToUInt(body.length, 3)       // Length
      ];
      next(Buffer.concat([...header, ...body]));
      return;
    }

    if (this._stage === TLS_STAGE_CHANGE_CIPHER_SPEC) {
      this._stage = TLS_STAGE_APPLICATION_DATA;
      return Buffer.concat([
        stb('14'),   // Content Type: Change Cipher Spec
        stb('0303'), // Version: TLS 1.2
        stb('0001'), // Length
        stb('01'),   // Change Cipher Spec Message
        // Handshake Protocol: Multiple Handshake Messages
        stb('16'),   // Content Type: Handshake
        stb('0303'), // Version: TLS 1.2
        stb('0020'), // Length: 32
        crypto.randomBytes(0x20)
      ]);
    }

    if (this._stage === TLS_STAGE_APPLICATION_DATA) {
      return Buffer.concat([
        stb('17'),   // Content Type: Application Data
        stb('0303'), // Version: TLS 1.2
        Utils.numberToUInt(this._pending.length),
        this._pending
      ]);
    }
  }

  serverIn({buffer, fail}) {
    if (this._stage === TLS_STAGE_HELLO) {
      this._stage = TLS_STAGE_APPLICATION_DATA;

      if (buffer.length < 500) {
        fail('TLS handshake header is too short');
        return;
      }

      if (!buffer.slice(0, 3).equals(stb('160301'))) {
        fail('invalid TLS handshake header');
        return;
      }

      const tlsLen = buffer.slice(3, 5).readUInt16BE(0);

      if (tlsLen !== buffer.length - 5) {
        fail('unexpected TLS handshake header length');
        return;
      }

      const exts = [
        // Extension: renegotiation_info
        stb('ff01000100'),
        // Extension: status_request
        stb('00050000'),
        // Extension: Extended Master Secret
        stb('00170000')
      ];

      const body = [
        stb('0303'),                // Version: TLS 1.2
        getUTC(),                   // GMT Unix Time
        crypto.randomBytes(28),     // Random Bytes
        stb('20'),                  // Session ID Length
        crypto.randomBytes(0x20),   // Session ID

        stb('c02f'),                // Cipher Suite
        stb('00'),                  // Compression Method

        Utils.numberToUInt(exts.length), // Extension Length
        ...exts                          // Extensions
      ];

      const header = [
        stb('16'),                               // Content Type: Handshake
        stb('0303'),                             // Version: TLS 1.2
        Utils.numberToUInt(1 + 3 + body.length), // Length
        stb('02'),                               // Handshake Type: Server Hello
        Utils.numberToUInt(body.length, 3)       // Length
      ];

      const finished = [
        stb('16'),   // Content Type: Handshake
        stb('0303'), // Version: TLS 1.2
        stb('0020'), // Length: 32 TODO: random length
        crypto.randomBytes(0x20)
      ];

      return Buffer.concat([
        ...header,
        ...body,
        stb('140303001001'), // Change Cipher Spec
        ...finished
      ]);
    }

    if (this._stage === TLS_STAGE_APPLICATION_DATA) {
      return buffer;
    }
  }

  // serverOut({buffer}) {
  //
  // }
  //
  // clientIn({buffer}) {
  //
  // }

}
