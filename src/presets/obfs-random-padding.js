import crypto from 'crypto';
import { IPreset } from './defs';
import { AdvancedBuffer, getRandomChunks, numberToBuffer as ntb } from '../utils';

/**
 * @description
 *   A simple obfuscator to significantly randomize the length of each packet.
 *   It can be used to prevent statistical analysis based on packet length.
 *
 * @examples
 *   {"name": "obfs-random-padding"}
 *
 * @protocol
 *
 *   # TCP stream
 *   +-----------+-----------+-----+
 *   |  Chunk_0  |  Chunk_1  | ... |
 *   +-----------+-----------+-----+
 *   | Variable  | Variable  | ... |
 *   +-----------+-----------+-----+
 *
 *   # TCP chunk_i
 *   +------------+-----------+----------+-----------+
 *   | PaddingLen |  Padding  |  DataLen |   Data    |
 *   +------------+-----------+----------+-----------+
 *   |     1      | Variable  |    2     | Variable  |
 *   +------------+-----------+----------+-----------+
 *
 *   # UDP packet
 *   +------------+-----------+------------+
 *   | PaddingLen |  Padding  |    Data    |
 *   +------------+-----------+------------+
 *   |     1      | Variable  |  Variable  |
 *   +------------+-----------+------------+
 *
 * @explain
 *   1. PaddingLen is randomly picked from [0, 0xFF].
 *   2. PADDING is filled with random bytes.
 *   3. Because DataLen occupies 2 bytes, the length of each Data is therefore limited to [0, 0xFFFF].
 *   4. PaddingLen and DataLen are big-endian.
 */
export default class ObfsRandomPaddingPreset extends IPreset {

  _adBuf = null;

  onInit() {
    this._adBuf = new AdvancedBuffer({ getPacketLength: this.onReceiving.bind(this) });
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onDestroy() {
    this._adBuf.clear();
    this._adBuf = null;
  }

  // tcp

  /**
   * return length of random bytes base on dataLen,
   * idea is took from ssr auth_chain_a.
   * @param dataLen
   * @returns {Number}
   */
  getRandomBytesLength(dataLen) {
    if (dataLen > 1440) {
      return 0;
    }
    const rand = crypto.randomBytes(1)[0];
    let random_bytes_len;
    if (dataLen > 1300) {
      random_bytes_len = rand % 31;
    } else if (dataLen > 900) {
      random_bytes_len = rand % 127;
    } else if (dataLen > 400) {
      random_bytes_len = rand % 521;
    } else {
      random_bytes_len = rand % 1021;
    }
    return random_bytes_len;
  }

  beforeOut({ buffer }) {
    const chunks = getRandomChunks(buffer, 0x3fff, 0xffff).map((data) => {
      const pLen = this.getRandomBytesLength(data.length);
      const padding = crypto.randomBytes(pLen);
      return Buffer.concat([ntb(pLen, 1), padding, ntb(data.length), data]);
    });
    return Buffer.concat(chunks);
  }

  beforeIn({ buffer, next }) {
    this._adBuf.put(buffer, { next });
  }

  onReceiving(buffer) {
    if (buffer.length < 3) {
      return; // too short to get PaddingLen
    }
    const pLen = buffer[0];
    if (buffer.length < 1 + pLen + 2) {
      return; // too short to drop Padding and get DataLen
    }
    const dLen = buffer.readUInt16BE(1 + pLen);
    if (buffer.length < 1 + pLen + 2 + dLen) {
      return; // too short to get Data
    }
    return 1 + pLen + 2 + dLen;
  }

  onChunkReceived(chunk, { next }) {
    const pLen = chunk[0];
    next(chunk.slice(1 + pLen + 2));
  }

  // udp

  beforeOutUdp({ buffer }) {
    const pLen = crypto.randomBytes(1)[0] % 128;
    const padding = crypto.randomBytes(pLen);
    return Buffer.concat([ntb(pLen, 1), padding, buffer]);
  }

  beforeInUdp({ buffer, fail }) {
    if (buffer.length < 1) {
      return fail(`too short to get PaddingLen, len=${buffer.length} dump=${buffer.toString('hex')}`);
    }
    const pLen = buffer[0];
    if (buffer.length < 1 + pLen) {
      return fail(`too short to drop Padding, len=${buffer.length} dump=${buffer.slice(0, 60).toString('hex')}`);
    }
    return buffer.slice(1 + pLen);
  }

}
