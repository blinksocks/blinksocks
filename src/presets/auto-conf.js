import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
import {PIPE_DECODE, PIPE_ENCODE} from '../core/middleware';

const MAX_TIME_DIFF = 30; // seconds

/**
 * @description
 *   Auto configure preset suite.
 *
 * @notice
 *   This is an experimental preset, protocol can be changed at any time.
 *
 * @examples
 *
 *   // use local file
 *   {"name": "auto-conf", "params": {"suites": "suites.json"}}
 *
 *   // load from remote (doesn't support yet)
 *   {"name": "auto-conf", "params": {"suites": "https://some.where/suites.json"}}
 *
 * @protocol
 *
 *   # TCP handshake request (client -> server)
 *   +------------+-----------+------------+-------------+
 *   |  Suite ID  |    UTC    |  HMAC-MD5  |   PAYLOAD   |
 *   +------------+-----------+------------+-------------+
 *   |     2      |     4     |     16     |  Variable   |
 *   +------------+-----------+------------+-------------+
 *
 * @explain
 *   1. Suite ID (0 ~ 0xFFFF) is randomly generated and mapped to real one (Suite ID % suites.length) in the pre-shared suites.
 *   2. Suite ID, UTC are little-endian.
 *   3. HMAC-MD5 is HMAC(Suite ID + UTC).
 *   4. HMAC-MD5 key is EVP_BytesToKey(base64(orgKey) + base64(md5(Suite ID)), 16, 16).
 */
export default class AutoConfPreset extends IPreset {

  // this is an one-off preset, so no need to care about other redundant logic

  static suites = [];

  static checkParams({suites}) {
    if (typeof suites !== 'string' || suites.length < 1) {
      throw Error('\'suites\' is invalid');
    }
  }

  static onInit({suites}) {
    const rawText = fs.readFileSync(path.resolve(process.cwd(), suites), {encoding: 'utf-8'});
    AutoConfPreset.suites = JSON.parse(rawText);
    if (AutoConfPreset.suites.length < 1) {
      throw Error(`you must provide at least one suite in ${suites}`);
    }
  }

  clientOut({buffer, broadcast}) {
    const sid = crypto.randomBytes(2);
    const utc = ntb(getCurrentTimestampInt(), 4, BYTE_ORDER_LE);
    const hmac_key = EVP_BytesToKey(Buffer.from(__KEY__).toString('base64') + hash('md5', sid).toString('base64'), 16, 16);
    const request_hmac = hmac('md5', hmac_key, Buffer.concat([sid, utc]));

    const {suites} = AutoConfPreset;
    const suite = suites[sid.readUInt16LE(0) % suites.length];
    logger.verbose(`[auto-conf] changing presets suite to: ${JSON.stringify(suite)}`);

    broadcast({
      type: CHANGE_PRESET_SUITE,
      payload: {
        type: PIPE_ENCODE,
        presets: suite.presets,
        data: buffer,
        createWrapper: (buf) => Buffer.concat([sid, utc, request_hmac, buf])
      }
    });
  }

  serverIn({buffer, broadcast, fail}) {
    if (buffer.length < 22) {
      return fail(`client request is too short, dump=${dumpHex(buffer)}`);
    }
    const sid = buffer.slice(0, 2);
    const request_hmac = buffer.slice(6, 22);
    const hmac_key = EVP_BytesToKey(Buffer.from(__KEY__).toString('base64') + hash('md5', sid).toString('base64'), 16, 16);
    const hmac_calc = hmac('md5', hmac_key, buffer.slice(0, 6));
    if (!hmac_calc.equals(request_hmac)) {
      return fail(`unexpected hmac of client request, dump=${dumpHex(buffer)}`);
    }
    const utc = buffer.readUInt32LE(2);
    const time_diff = Math.abs(utc - getCurrentTimestampInt());
    if (time_diff > MAX_TIME_DIFF) {
      return fail(`timestamp diff is over ${MAX_TIME_DIFF}s, dump=${dumpHex(buffer)}`);
    }

    const {suites} = AutoConfPreset;
    const suite = suites[sid.readUInt16LE(0) % suites.length];
    logger.verbose(`[auto-conf] changing presets suite to: ${JSON.stringify(suite)}`);

    broadcast({
      type: CHANGE_PRESET_SUITE,
      payload: {
        type: PIPE_DECODE,
        presets: suite.presets,
        data: buffer.slice(22)
      }
    });
  }

}
