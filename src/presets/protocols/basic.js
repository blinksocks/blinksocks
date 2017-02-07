import crypto from 'crypto';
import {
  CRYPTO_SET_IV_AFTER,
  CRYPTO_SET_IV
} from '../../constants';
import {IProtocol} from './interface';

const IV_LEN = 16;

// Handshake packet:
//
// +-------+----------------+
// |  IV   |    PAYLOAD     |
// +-------+----------------+ = packet(encrypted without IV)
// | Fixed |    Variable    |
// +-------+----------------+
//
// Following packets:
//
// +----------------+
// |    PAYLOAD     |
// +----------------+ (encrypted with IV)
// |    Variable    |
// +----------------+
//
export default class BasicProtocol extends IProtocol {

  _isHandshakeDone = false;

  forwardToServer(payload, next, broadcast) {
    if (this._isHandshakeDone) {
      return payload;
    } else {
      const iv = crypto.randomBytes(IV_LEN);
      broadcast({
        type: CRYPTO_SET_IV_AFTER,
        payload: iv
      });
      this._isHandshakeDone = true;
      return Buffer.concat([
        iv,
        payload
      ]);
    }
  }

  forwardToDst(packet, next, broadcast) {
    if (this._isHandshakeDone) {
      return packet;
    } else {
      const iv = packet.slice(0, IV_LEN);
      broadcast({
        type: CRYPTO_SET_IV,
        payload: iv
      });
      this._isHandshakeDone = true;
      return packet.slice(IV_LEN);
    }
  }

  backwardToClient(payload) {
    return payload;
  }

  backwardToApplication(packet) {
    return packet;
  }

}
