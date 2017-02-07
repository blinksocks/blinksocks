import {
  MIDDLEWARE_DIRECTION_UPWARD,
  IMiddleware
} from '../Interface';
import {
  CRYPTO_SET_IV,
  CRYPTO_SET_IV_AFTER
} from '../../../constants';

import {Crypto} from '../../Crypto';

export class CryptoMiddleware extends IMiddleware {

  _cipher = null;

  _decipher = null;

  _set_iv_after = null;

  next = null;

  constructor(props) {
    super(props);
    this.onFinished = this.onFinished.bind(this);
    this.updateCiphers();
  }

  onNotified(action) {
    switch (action.type) {
      case CRYPTO_SET_IV_AFTER: {
        const iv = action.payload;
        this._set_iv_after = this.updateCiphers.bind(this, iv);
        break;
      }
      case CRYPTO_SET_IV: {
        const iv = action.payload;
        this.updateCiphers(iv);
        break;
      }
      default:
        return false;
    }
    return true;
  }

  write(direction, buffer) {
    return new Promise((next) => {
      // TODO(refactor): this temporary and bad design
      this.next = next;

      if (direction === MIDDLEWARE_DIRECTION_UPWARD) {
        this._cipher.write(buffer);
      } else {
        this._decipher.write(buffer);
      }
    });
  }

  updateCiphers(iv) {
    this._cipher = Crypto.createCipher(this.onFinished, iv);
    this._decipher = Crypto.createDecipher(this.onFinished, iv);
  }

  onFinished(buffer) {
    this.next(buffer);
    if (this._set_iv_after !== null) {
      this._set_iv_after();
      this._set_iv_after = null;
    }
  }

}
