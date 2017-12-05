import {AdvancedBuffer, getRandomChunks, numberToBuffer as ntb} from '../utils';
import {CONNECT_TO_REMOTE, CONNECTION_WILL_CLOSE, IPreset, MUX_DATA_FRAME, MUX_SUB_CLOSE} from './defs';
import {PIPE_ENCODE} from '../core';

const CMD_DATA_FRAME = 0x00;
const CMD_SUB_CLOSE = 0x01;

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
 *     0x01: close sub connection
 */
export default class MuxPreset extends IPreset {

  _adBuf = null;

  _host = null;

  _port = null;

  _cid = 0;

  constructor() {
    super();
    this._adBuf = new AdvancedBuffer({getPacketLength: this.onReceiving.bind(this)});
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onNotified(action) {
    if (action.type === CONNECT_TO_REMOTE) {
      const {host, port, cid} = action.payload;
      this._host = host;
      this._port = port;
      this._cid = cid;
    }
    if (__IS_CLIENT__ && action.type === CONNECTION_WILL_CLOSE) {
      this.next(PIPE_ENCODE, this.createChunk(CMD_SUB_CLOSE, this._cid, Buffer.alloc(0)));
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

  onChunkReceived(chunk, {broadcast, fail}) {
    const cmd = chunk[0];
    const cid = chunk.readUInt16BE(1);
    const dataLen = chunk.readUInt16BE(3);
    switch (cmd) {
      case CMD_DATA_FRAME:
        broadcast({
          type: MUX_DATA_FRAME,
          payload: {
            // TODO(refactor): find a way to remove wordy "host" and "port".
            host: this._host,
            port: this._port,
            cid,
            data: chunk.slice(-dataLen)
          }
        });
        break;
      case CMD_SUB_CLOSE:
        broadcast({
          type: MUX_SUB_CLOSE,
          payload: cid
        });
        break;
      default:
        fail(`unknown command: ${cmd}`);
        break;
    }
  }

  createChunk(cmd, cid, buffer) {
    return Buffer.concat([ntb(cmd, 1), ntb(cid, 2), ntb(buffer.length), buffer]);
  }

  beforeOut({buffer}) {
    const chunks = getRandomChunks(buffer, 0x0800, 0x3fff).map((chunk) =>
      this.createChunk(CMD_DATA_FRAME, this._cid, chunk)
    );
    return Buffer.concat(chunks);
  }

  beforeIn({buffer, broadcast, fail}) {
    this._adBuf.put(buffer, {broadcast, fail});
  }

}
