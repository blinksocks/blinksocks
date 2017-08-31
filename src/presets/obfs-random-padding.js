import crypto from 'crypto';
import {IPreset} from './defs';
import {AdvancedBuffer, getRandomInt, getRandomChunks, numberToBuffer} from '../utils';

/**
 * @description
 *   A simple obfuscator to significantly randomize the length of each packet.
 *   It can be used to prevent statistical analysis based on packet length.
 *
 * @examples
 *   {
 *     "name": "obfs-random-padding"
 *   }
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
 *   # Chunk_i
 *   +------------+-----------+----------+-----------+
 *   | PaddingLen |  Padding  |  DataLen |   Data    |
 *   +------------+-----------+----------+-----------+
 *   |     1      | Variable  |    2     | Variable  |
 *   +------------+-----------+----------+-----------+
 *
 * @explain
 *   1. PaddingLen is randomly picked from [0, 0xFF].
 *   2. PADDING is filled with random bytes.
 *   3. Because DataLen occupies 2 bytes, the length of each Data is therefore limited to [0, 0xFFFF].
 *   4. PaddingLen and DataLen are big-endian.
 */
export default class ObfsRandomPaddingPreset extends IPreset {

  _adBuf = null;

  constructor() {
    super();
    this._adBuf = new AdvancedBuffer({getPacketLength: this.onReceiving.bind(this)});
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  beforeOut({buffer}) {
    const chunks = getRandomChunks(buffer, 0, 0xffff).map((data) => {
      const pLen = getRandomInt(0, 0xff);
      const padding = crypto.randomBytes(pLen);
      return Buffer.concat([numberToBuffer(pLen, 1), padding, numberToBuffer(data.length), data]);
    });
    return Buffer.concat(chunks);
  }

  beforeIn({buffer, next}) {
    this._adBuf.put(buffer, {next});
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

  onChunkReceived(chunk, {next}) {
    const pLen = chunk[0];
    next(chunk.slice(1 + pLen + 2));
  }

}
