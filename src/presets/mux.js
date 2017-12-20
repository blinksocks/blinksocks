import {AdvancedBuffer, dumpHex, getRandomChunks, numberToBuffer as ntb} from '../utils';
import {
  IPreset,
  CONNECT_TO_REMOTE,
  CONNECTION_WILL_CLOSE,
  MUX_NEW_CONN,
  MUX_DATA_FRAME,
  MUX_CLOSE_CONN
} from './defs';
import {PIPE_ENCODE} from '../core';

const CMD_NEW_CONN = 0x00;
const CMD_DATA_FRAME = 0x01;
const CMD_CLOSE_CONN = 0x02;

/**
 * @description
 *   TCP multiplexing protocol.
 *
 * @examples
 *   {"name": "mux"}
 *
 * @protocol
 *
 *   # New Connection (client -> server)
 *   +-------+-------+------+----------+----------+
 *   |  CMD  |  CID  | ALEN | DST.ADDR | DST.PORT |
 *   +-------+-------+------+----------+----------+  +  [data frames]
 *   |  0x0  |   1   |  1   | Variable |    2     |
 *   +-------+-------+------+----------+----------+
 *
 *   # Close Connection (client <-> server)
 *   +-------+-------+
 *   |  CMD  |  CID  |
 *   +-------+-------+  +  [data frames]
 *   |  0x2  |   1   |
 *   +-------+-------+
 *
 *   # Data Frames (client <-> server)
 *   +-------+-------+------------+-------------+
 *   |  CMD  |  CID  |  DATA LEN  |    DATA     |
 *   +-------+-------+------------+-------------+
 *   |  0x1  |   1   |     2      |  Variable   |
 *   +-------+-------+------------+-------------+
 *
 */
export default class MuxPreset extends IPreset {

  _adBuf = null;

  _host = null;

  _port = null;

  _cid = null;

  _isNewConnSent = false;

  _isCloseConnSent = false;

  // _pending = null;

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
    if (action.type === CONNECTION_WILL_CLOSE && !this._isCloseConnSent) {
      this._isCloseConnSent = true;
      this.next(PIPE_ENCODE, this.createCloseConn(this._cid)/* TODO: append random data frames */);
    }
  }

  onDestroy() {
    this._adBuf.clear();
    this._adBuf = null;
  }

  onReceiving(buffer, {fail}) {
    if (buffer.length < 2) {
      return; // too short, continue to recv
    }
    const cmd = buffer[0];
    switch (cmd) {
      case CMD_NEW_CONN:
        return 5 + buffer[2];
      case CMD_DATA_FRAME:
        return 4 + buffer.readUInt16BE(2);
      case CMD_CLOSE_CONN:
        return 2;
      default:
        fail(`unknown cmd=${cmd} dump=${dumpHex(buffer)}`);
        return -1;
    }
  }

  onChunkReceived(chunk, {broadcast}) {
    const cmd = chunk[0];
    const cid = chunk[1];
    switch (cmd) {
      case CMD_NEW_CONN: {
        // TODO: cache rest data to pending buffer
        const host = chunk.slice(3, -2).toString();
        const port = chunk.readUInt16BE(3 + chunk[2]);
        return broadcast({
          type: MUX_NEW_CONN,
          payload: {
            host, port, cid, onCreated: () => {
              // TODO: continue to resolve pending buffer
            }
          }
        });
      }
      case CMD_DATA_FRAME: {
        const dataLen = buffer.readUInt16BE(2);
        return broadcast({
          type: MUX_DATA_FRAME,
          payload: {cid: cid, data: chunk.slice(-dataLen)}
        });
      }
      case CMD_CLOSE_CONN:
        return broadcast({
          type: MUX_CLOSE_CONN, payload: {cid}
        });
    }
  }

  createDataFrames(cid, data) {
    const chunks = getRandomChunks(data, 0x0800, 0x3fff).map((chunk) =>
      Buffer.concat([ntb(CMD_DATA_FRAME, 1), ntb(cid, 1), ntb(chunk.length, 1), chunk])
    );
    return Buffer.concat(chunks);
  }

  createNewConn(host, port, cid) {
    const _host = Buffer.from(host);
    const _port = ntb(port);
    return Buffer.concat([ntb(CMD_NEW_CONN, 1), ntb(cid, 1), ntb(_host.length), _host, _port]);
  }

  createCloseConn(cid) {
    return Buffer.concat([ntb(CMD_CLOSE_CONN, 1), ntb(cid, 1)]);
  }

  clientOut({buffer}) {
    const dataFrames = this.createDataFrames(this._cid, buffer);
    if (!this._isNewConnSent) {
      this._isNewConnSent = true;
      return Buffer.concat([this.createNewConn(this._host, this._port, this._cid), dataFrames]);
    }
    return dataFrames;
  }

  serverOut({buffer}) {
    return this.createDataFrames(this._cid, buffer);
  }

  beforeIn({buffer, broadcast, fail}) {
    this._adBuf.put(buffer, {broadcast, fail});
  }

}
