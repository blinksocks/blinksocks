import crypto from 'crypto';
import {
  CRYPTO_SET_IV_AFTER,
  CRYPTO_SET_IV
} from '../../constants';
import {Utils} from '../../utils';
import {IProtocolMiddleware} from './interface';

const IV_LEN = 16;

// Handshake packet:
//
// +-----+-------+----------------+
// | LEN |  IV   |    PAYLOAD     |
// +-----+-------+----------------+ = packet(encrypted without IV)
// |  2  | Fixed |    Variable    |
// +-----+-------+----------------+
//
// Following packets:
//
// +-----+----------------+
// | LEN |    PAYLOAD     |
// +-----+----------------+ (encrypted with IV)
// |  2  |    Variable    |
// +-----+----------------+
//
export default class BasicProtocolMiddleware extends IProtocolMiddleware {

  _isHandshakeDone = false;

  forwardToServer(payload, next, notify) {
    if (this._isHandshakeDone) {
      return Buffer.concat([
        Buffer.from(Utils.numberToArray(2 + payload.length)),
        payload
      ]);
    } else {
      const iv = crypto.randomBytes(IV_LEN);
      notify({
        type: CRYPTO_SET_IV_AFTER,
        payload: iv
      });
      this._isHandshakeDone = true;
      return Buffer.concat([
        Buffer.from(Utils.numberToArray(2 + iv.length + payload.length)),
        iv,
        payload
      ]);
    }
  }

  forwardToDst(packet, next, notify) {
    if (this._isHandshakeDone) {
      return packet.slice(2);
    } else {
      const iv = packet.slice(2, 2 + IV_LEN);
      notify({
        type: CRYPTO_SET_IV,
        payload: iv
      });
      this._isHandshakeDone = true;
      return packet.slice(2 + IV_LEN);
    }
  }

  backwardToClient(payload) {
    return payload;
  }

  backwardToApplication(packet) {
    return packet;
  }

}
