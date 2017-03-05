import logger from 'winston';
import {IPreset} from '../interface';
import {AdvancedBuffer, Utils} from '../../utils';

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
 *   2. LEN is plaintext.
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

  clientOut({buffer}) {
    const out = Buffer.concat([Utils.numberToUIntBE(2 + buffer.length), buffer]);
    logger.info(`ClientOut(${out.length} bytes): ${out.slice(0, 60).toString('hex')}`);
    return out;
  }

  serverIn({buffer, next}) {
    this._fNext = next;
    this._adBuf.put(buffer);
  }

  serverOut({buffer}) {
    const out = Buffer.concat([Utils.numberToUIntBE(2 + buffer.length), buffer]);
    logger.info(`serverOut(${out.length} bytes): ${out.slice(0, 60).toString('hex')}`);
    return out;
  }

  clientIn({buffer, next}) {
    this._bNext = next;
    this._adBuf.put(buffer);
  }

  onGetLength(buffer) {
    return buffer.readUIntBE(0, 2);
  }

  onReceived(packet) {
    if (__IS_CLIENT__) {
      logger.info(`ClientIn(${packet.length} bytes): ${packet.slice(0, 60).toString('hex')}`);
    } else {
      logger.info(`ServerIn(${packet.length} bytes): ${packet.slice(0, 60).toString('hex')}`);
    }
    const next = __IS_CLIENT__ ? this._bNext : this._fNext;
    next(packet.slice(2));
  }

}
