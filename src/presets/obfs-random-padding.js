import crypto from 'crypto';
import {IPreset} from './defs';
import {getRandomInt, AdvancedBuffer, numberToBuffer} from '../utils';

export default class ObfsRandomPaddingPreset extends IPreset {

  _adBuf = null;

  _isPaddingDropped = false;

  constructor() {
    super();
    this._adBuf = new AdvancedBuffer({
      getPacketLength: this.onReceiving.bind(this)
    });
    this._adBuf.on('data', this.onReceived.bind(this));
  }

  beforeOut({buffer}) {
    const pLen = getRandomInt(0, 0xff);
    const padding = crypto.randomBytes(pLen);
    return Buffer.concat([numberToBuffer(pLen), padding, buffer]);
  }

  beforeIn({buffer, next, fail}) {
    this._adBuf.put(buffer, {next, fail});
  }

  onReceiving(buffer, {fail}) {
    if (this._isPaddingDropped) {
      this._isPaddingDropped = false;
      return buffer.length;
    }
    if (buffer.length < 2) {
      return fail(`too short to get padding length, dump=${buffer.toString('hex')}`);
    }
    const pLen = buffer.readUInt16BE(0);
    if (buffer.length < 2 + pLen) {
      return; // too short to drop padding
    }
    this._isPaddingDropped = true;
    return buffer.slice(2 + pLen); // drop padding
  }

  onReceived(buffer, {next}) {
    next(buffer);
  }

}
