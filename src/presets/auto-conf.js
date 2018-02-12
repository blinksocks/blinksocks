import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import fetch from 'node-fetch';
import promisify from 'pify';
import {IPreset, CHANGE_PRESET_SUITE} from './defs';
import {
  logger,
  hmac,
  hash,
  dumpHex,
  numberToBuffer as ntb, BYTE_ORDER_LE,
  getCurrentTimestampInt,
  EVP_BytesToKey
} from '../utils';
import {PIPE_DECODE, PIPE_ENCODE} from '../constants';

const readFile = promisify(fs.readFile);
const MAX_TIME_DIFF = 30; // seconds
const NOOP = Buffer.alloc(0);

/**
 * @description
 *   Auto configure preset suite.
 *
 * @notice
 *   This is an experimental preset, protocol can be changed at any time.
 *
 * @params
 *   suites: A json file includes a set of preset combinations.
 *
 * @examples
 *
 *   // use local file
 *   {"name": "auto-conf", "params": {"suites": "suites.json"}}
 *
 *   // load from remote use http(s)
 *   {"name": "auto-conf", "params": {"suites": "https://some.where/suites.json"}}
 *
 * @protocol
 *
 *   # TCP handshake request & UDP packets (client -> server)
 *   +------------+-----------+------------+-------------+
 *   |  Suite ID  |    UTC    |  HMAC-MD5  |   PAYLOAD   |
 *   +------------+-----------+------------+-------------+
 *   |     2      |     4     |     16     |  Variable   |
 *   +------------+-----------+------------+-------------+
 *                |<-- RC4 -->|
 *
 *   # TCP chunks (client <-> server)
 *   +-------------+
 *   |   PAYLOAD   |
 *   +-------------+
 *   |  Variable   |
 *   +-------------+
 *
 *   # UDP packets (client <- server)
 *   +-------------+
 *   |   PAYLOAD   |
 *   +-------------+
 *   |  Variable   |
 *   +-------------+
 *
 * @explain
 *   1. Suite ID should be randomly generated and mapped to real one (Suite ID % suites.length) in the pre-shared suites.
 *   2. Suite ID and UTC are little-endian.
 *   3. UTC is encrypted by RC4.
 *   4. HMAC-MD5 is HMAC(Suite ID + RC4(UTC)).
 *   5. RC4 and HMAC-MD5 key are EVP_BytesToKey(base64(orgKey) + base64(md5(Suite ID)), 16, 16).
 */
export default class AutoConfPreset extends IPreset {

  _isSuiteChanged = false;

  _isHeaderSent = false;

  _header = null;

  _ctx = null;

  static suites = [];

  static checkParams({suites}) {
    if (typeof suites !== 'string' || suites.length < 1) {
      throw Error('\'suites\' is invalid');
    }
  }

  constructor(_, ctx) {
    super();
    this._ctx = ctx;
  }

  static async onInit({suites: uri}) {
    logger.info(`[auto-conf] loading suites from: ${uri}`);
    let suites = [];
    if (uri.startsWith('http')) {
      // load from remote
      const res = await fetch(uri);
      suites = await res.json();
    } else {
      // load from file system
      const suiteJson = path.resolve(process.cwd(), uri);
      const rawText = await readFile(suiteJson, {encoding: 'utf-8'});
      suites = JSON.parse(rawText);
    }
    if (suites.length < 1) {
      throw Error(`you must provide at least one suite in ${uri}`);
    }
    logger.info(`[auto-conf] ${suites.length} suites loaded`);
    AutoConfPreset.suites = suites;
  }

  onDestroy() {
    this._header = null;
  }

  createRequestHeader(suites) {
    const sid = crypto.randomBytes(2);
    const utc = ntb(getCurrentTimestampInt(), 4, BYTE_ORDER_LE);
    const key = EVP_BytesToKey(Buffer.from(this._ctx.KEY).toString('base64') + hash('md5', sid).toString('base64'), 16, 16);
    const cipher = crypto.createCipheriv('rc4', key, NOOP);
    const enc_utc = cipher.update(utc);
    const request_hmac = hmac('md5', key, Buffer.concat([sid, enc_utc]));
    return {
      header: Buffer.concat([sid, enc_utc, request_hmac]),
      suite: suites[sid.readUInt16LE(0) % suites.length]
    };
  }

  encodeChangeSuite({buffer, broadcast, fail}) {
    const {suites} = AutoConfPreset;
    if (suites.length < 1) {
      return fail('suites are not initialized properly');
    }
    const {header, suite} = this.createRequestHeader(suites);
    this._header = header;
    this._isSuiteChanged = true;
    return broadcast({
      type: CHANGE_PRESET_SUITE,
      payload: {
        type: PIPE_ENCODE,
        suite: suite,
        data: buffer
      }
    });
  }

  decodeChangeSuite({buffer, broadcast, fail}) {
    const {suites} = AutoConfPreset;
    if (suites.length < 1) {
      return fail('suites are not initialized properly');
    }
    if (buffer.length < 22) {
      return fail(`client request is too short, dump=${dumpHex(buffer)}`);
    }
    const sid = buffer.slice(0, 2);
    const request_hmac = buffer.slice(6, 22);
    const key = EVP_BytesToKey(Buffer.from(this._ctx.KEY).toString('base64') + hash('md5', sid).toString('base64'), 16, 16);
    const hmac_calc = hmac('md5', key, buffer.slice(0, 6));
    if (!hmac_calc.equals(request_hmac)) {
      return fail(`unexpected hmac of client request, dump=${dumpHex(buffer)}`);
    }
    const enc_utc = buffer.slice(2, 6);
    const decipher = crypto.createDecipheriv('rc4', key, NOOP);
    const utc = decipher.update(enc_utc).readUInt32LE(0);
    const time_diff = Math.abs(utc - getCurrentTimestampInt());
    if (time_diff > MAX_TIME_DIFF) {
      return fail(`timestamp diff is over ${MAX_TIME_DIFF}s, dump=${dumpHex(buffer)}`);
    }
    const suite = suites[sid.readUInt16LE(0) % suites.length];
    this._isSuiteChanged = true;
    return broadcast({
      type: CHANGE_PRESET_SUITE,
      payload: {
        type: PIPE_DECODE,
        suite: suite,
        data: buffer.slice(22)
      }
    });
  }

  // tcp

  clientOut({buffer, broadcast, fail}) {
    if (!this._isSuiteChanged) {
      return this.encodeChangeSuite({buffer, broadcast, fail})
    }
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      return Buffer.concat([this._header, buffer]);
    } else {
      return buffer;
    }
  }

  serverIn({buffer, broadcast, fail}) {
    if (!this._isSuiteChanged) {
      return this.decodeChangeSuite({buffer, broadcast, fail});
    } else {
      return buffer;
    }
  }

  // udp

  clientOutUdp({buffer, broadcast, fail}) {
    if (!this._isSuiteChanged) {
      return this.encodeChangeSuite({buffer, broadcast, fail});
    } else {
      this._isSuiteChanged = false;
      return Buffer.concat([this._header, buffer]);
    }
  }

  serverInUdp({buffer, broadcast, fail}) {
    if (!this._isSuiteChanged) {
      return this.decodeChangeSuite({buffer, broadcast, fail});
    } else {
      this._isSuiteChanged = false;
      return buffer;
    }
  }

}
