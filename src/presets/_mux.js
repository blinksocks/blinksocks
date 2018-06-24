import { IPresetAddressing } from './defs';
import {
  AdvancedBuffer,
  dumpHex,
  getRandomChunks,
  isValidHostname,
  isValidPort,
  numberToBuffer as ntb,
} from '../utils';

const CMD_NEW_CONN = 0x00;
const CMD_DATA_FRAME = 0x01;
const CMD_CLOSE_CONN = 0x02;

/**
 * @description
 *   Multiplexing protocol.
 *
 * @protocol
 *
 *   # New Connection (client -> server)
 *   +-------+-------+------+----------+----------+
 *   |  CMD  |  CID  | ALEN | DST.ADDR | DST.PORT |
 *   +-------+-------+------+----------+----------+  +  [Data Frames]
 *   |  0x0  |   4   |  1   | Variable |    2     |
 *   +-------+-------+------+----------+----------+
 *
 *   # Data Frames (client <-> server)
 *   +-------+-------+------------+-------------+
 *   |  CMD  |  CID  |  DATA LEN  |    DATA     |
 *   +-------+-------+------------+-------------+
 *   |  0x1  |   4   |     2      |  Variable   |
 *   +-------+-------+------------+-------------+
 *
 *   # Close Connection (client <-> server)
 *   +-------+-------+
 *   |  CMD  |  CID  |
 *   +-------+-------+
 *   |  0x2  |   4   |
 *   +-------+-------+
 *
 */
export default class MuxPreset extends IPresetAddressing {

  static isPrivate = true;

  _adBuf = null;

  onInit() {
    this._adBuf = new AdvancedBuffer({ getPacketLength: this.onReceiving.bind(this) });
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onDestroy() {
    this._adBuf.clear();
    this._adBuf = null;
  }

  onReceiving(buffer, { fail }) {
    if (buffer.length < 5) {
      return; // too short, continue to recv
    }
    const cmd = buffer[0];
    switch (cmd) {
      case CMD_NEW_CONN:
        if (buffer.length < 8 + buffer[5]) {
          return;
        }
        return 8 + buffer[5];
      case CMD_DATA_FRAME:
        if (buffer.length < 7) {
          return;
        }
        return 7 + buffer.readUInt16BE(5);
      case CMD_CLOSE_CONN:
        return 5;
      default:
        fail(`unknown cmd=${cmd} dump=${dumpHex(buffer)}`);
        return -1;
    }
  }

  onChunkReceived(chunk, { fail }) {
    const cmd = chunk[0];
    const cid = chunk.slice(1, 5).toString('hex');
    switch (cmd) {
      case CMD_NEW_CONN: {
        const hostBuf = chunk.slice(6, -2);
        const host = hostBuf.toString();
        const port = chunk.readUInt16BE(6 + chunk[5]);
        if (!isValidHostname(host) || !isValidPort(port)) {
          return fail(`invalid host or port, host=${dumpHex(hostBuf)} port=${port}`);
        }
        return this.muxNewConn({ cid, host, port });
      }
      case CMD_DATA_FRAME: {
        const dataLen = chunk.readUInt16BE(5);
        return this.muxDataFrame({ cid, data: chunk.slice(-dataLen) });
      }
      case CMD_CLOSE_CONN:
        return this.muxCloseConn({ cid });
    }
  }

  createDataFrames(cid, data) {
    const chunks = getRandomChunks(data, 0x0800, 0x3fff).map((chunk) =>
      Buffer.concat([ntb(CMD_DATA_FRAME, 1), cid, ntb(chunk.length), chunk])
    );
    return Buffer.concat(chunks);
  }

  createNewConn(host, port, cid) {
    const _host = Buffer.from(host);
    const _port = ntb(port);
    return Buffer.concat([ntb(CMD_NEW_CONN, 1), cid, ntb(_host.length, 1), _host, _port]);
  }

  createCloseConn(cid) {
    return Buffer.concat([ntb(CMD_CLOSE_CONN, 1), cid]);
  }

  clientOut({ buffer, fail }, { host, port, cid, isClosing }) {
    if (cid !== undefined) {
      const _cid = Buffer.from(cid, 'hex');
      if (isClosing) {
        return this.createCloseConn(_cid);
      }
      const dataFrames = this.createDataFrames(_cid, buffer);
      if (host && port) {
        return Buffer.concat([this.createNewConn(host, port, _cid), dataFrames]);
      }
      return dataFrames;
    } else {
      fail(`cid is not provided, drop buffer=${dumpHex(buffer)}`);
    }
  }

  serverOut({ buffer, fail }, { cid, isClosing }) {
    if (cid !== undefined) {
      const _cid = Buffer.from(cid, 'hex');
      if (isClosing) {
        return this.createCloseConn(_cid);
      }
      return this.createDataFrames(_cid, buffer);
    } else {
      fail(`cid is not provided, drop buffer=${dumpHex(buffer)}`);
    }
  }

  beforeIn({ buffer, fail }) {
    this._adBuf.put(buffer, { fail });
  }

}
