import {AdvancedBuffer, dumpHex, getRandomChunks, numberToBuffer as ntb} from '../utils';
import {IPresetAddressing, MUX_CLOSE_CONN, MUX_DATA_FRAME, MUX_NEW_CONN} from './defs';

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
 *   +-------+-------+
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
export default class MuxPreset extends IPresetAddressing {

  _adBuf = null;

  constructor() {
    super();
    this._adBuf = new AdvancedBuffer({getPacketLength: this.onReceiving.bind(this)});
    this._adBuf.on('data', this.onChunkReceived.bind(this));
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
        const host = chunk.slice(3, -2).toString();
        const port = chunk.readUInt16BE(3 + chunk[2]);
        return broadcast({
          type: MUX_NEW_CONN,
          payload: {
            host, port, cid
          }
        });
      }
      case CMD_DATA_FRAME: {
        const dataLen = chunk.readUInt16BE(2);
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
      Buffer.concat([ntb(CMD_DATA_FRAME, 1), ntb(cid, 1), ntb(chunk.length), chunk])
    );
    return Buffer.concat(chunks);
  }

  createNewConn(host, port, cid) {
    const _host = Buffer.from(host);
    const _port = ntb(port);
    return Buffer.concat([ntb(CMD_NEW_CONN, 1), ntb(cid, 1), ntb(_host.length, 1), _host, _port]);
  }

  createCloseConn(cid) {
    return Buffer.concat([ntb(CMD_CLOSE_CONN, 1), ntb(cid, 1)]);
  }

  clientOut({buffer}, {host, port, cid, isClosing}) {
    if (cid !== undefined) {
      const dataFrames = this.createDataFrames(cid, buffer);
      if (host && port) {
        return Buffer.concat([this.createNewConn(host, port, cid), dataFrames]);
      }
      if (isClosing) {
        return this.createCloseConn(cid);
      }
      return dataFrames;
    }
  }

  serverOut({buffer}, {cid, isClosing}) {
    if (cid !== undefined) {
      if (isClosing) {
        return this.createCloseConn(cid);
      }
      return this.createDataFrames(cid, buffer);
    }
  }

  beforeIn({buffer, broadcast, fail}) {
    this._adBuf.put(buffer, {broadcast, fail});
  }

}
