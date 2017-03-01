import logger from 'winston';
import getChunks from 'lodash.chunk';
import {IPreset} from '../interface';
import {AdvancedBuffer, Utils} from '../../utils';

const MAX_PAYLOAD_LEN = 65535 - 2;

/**
 * @description
 *   This implementation is very basic but has high-performance. Use it
 *   according to the scenario.
 *
 * @params
 *  no
 *
 * @examples
 *   "protocol": "basic"
 *   "protocol_params": ""
 *
 * @protocol
 *
 *   # TCP handshake & chunk
 *   +-----+----------------------------+
 *   | LEN |           PAYLOAD          |
 *   +-----+----------------------------+
 *   |  2  |           Variable         |
 *   +-----+----------------------------+
 *
 * @explain
 *   1. LEN is total length of the packet.
 */
export default class BasicProtocol extends IPreset {

  _adBuf = null;

  _fNext = null;

  _bNext = null;

  constructor() {
    super();
    this._adBuf = new AdvancedBuffer({getPacketLength: this.onGetLength.bind(this)});
    this._adBuf.on('data', (data) => this.onReceived(data));
  }

  beforeOut({buffer, next}) {
    if (buffer.length > MAX_PAYLOAD_LEN) {
      const chunks = getChunks(buffer, MAX_PAYLOAD_LEN);
      for (const chunk of chunks) {
        next(Buffer.from(chunk));
      }
    } else {
      return buffer;
    }
  }

  clientOut({buffer}) {
    const out = Buffer.concat([Utils.toBytesBE(2 + buffer.length), buffer]);
    logger.info(`ClientOut(${out.length} bytes): ${out.toString('hex').substr(0, 60)}`);
    return out;
  }

  serverIn({buffer, next}) {
    this._fNext = next;
    this._adBuf.put(buffer);
  }

  serverOut({buffer}) {
    const out = Buffer.concat([Utils.toBytesBE(2 + buffer.length), buffer]);
    logger.info(`serverOut(${out.length} bytes): ${out.toString('hex').substr(0, 60)}`);
    return out;
  }

  clientIn({buffer, next}) {
    this._bNext = next;
    this._adBuf.put(buffer);
  }

  onGetLength(buffer) {
    return buffer.readUInt16BE(0);
  }

  onReceived(packet) {
    if (__IS_CLIENT__) {
      logger.info(`ClientIn(${packet.length} bytes): ${packet.toString('hex').substr(0, 60)}`);
    } else {
      logger.info(`ServerIn(${packet.length} bytes): ${packet.toString('hex').substr(0, 60)}`);
    }
    const next = __IS_CLIENT__ ? this._bNext : this._fNext;
    next(packet.slice(2));
  }

}
