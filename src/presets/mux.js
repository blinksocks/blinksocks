import {AdvancedBuffer, getRandomChunks, numberToBuffer as ntb} from '../utils';
import {CONNECT_TO_REMOTE, MUX_FRAME, IPreset} from './defs';

/**
 * @description
 *   Multiplexing protocol.
 *
 * @examples
 *   {"name": "mux"}
 *
 * @protocol
 *
 *   # TCP Frames (client <-> server)
 *   +-------+-------+------------+-------------+
 *   |  CMD  |  CID  |  DATA LEN  |    DATA     |
 *   +-------+-------+------------+-------------+
 *   |   1   |   2   |     2      |  Variable   |
 *   +-------+-------+------------+-------------+
 *
 *   CMD
 *     0x00: data frame
 *     0x01: new connection
 *     0x02: close connection
 */
export default class MuxPreset extends IPreset {

  _adBuf = null;

  _host = null;

  _port = null;

  constructor() {
    super();
    this._adBuf = new AdvancedBuffer({getPacketLength: this.onReceiving.bind(this)});
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onNotified(action) {
    if (action.type === CONNECT_TO_REMOTE) {
      this._host = action.payload.host;
      this._port = action.payload.port;
    }
  }

  onDestroy() {
    this._adBuf.clear();
    this._adBuf = null;
  }

  onReceiving(buffer) {
    if (buffer.length < 5) {
      return; // too short, continue to recv
    }
    const dataLen = buffer.readUInt16BE(3);
    return 5 + dataLen;
  }

  onChunkReceived(chunk, {broadcast}) {
    const cmd = chunk[0];
    const cid = chunk.readUInt16BE(1);
    const dataLen = chunk.readUInt16BE(3);
    broadcast({
      type: MUX_FRAME,
      payload: {
        host: this._host, port: this._port, cmd, cid,
        data: chunk.slice(-dataLen)
      }
    });
  }

  beforeOut({buffer}) {
    const chunks = getRandomChunks(buffer, 0x0800, 0x3fff).map((chunk) => {
      const cmd = Buffer.alloc(1);
      const cid = Buffer.alloc(2);
      return Buffer.concat([cmd, cid, ntb(chunk.length), chunk]);
    });
    return Buffer.concat(chunks);
  }

  beforeIn({buffer, broadcast, fail}) {
    this._adBuf.put(buffer, {broadcast, fail});
  }

}
