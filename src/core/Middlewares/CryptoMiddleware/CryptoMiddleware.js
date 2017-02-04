import {
  MIDDLEWARE_DIRECTION_UPWARD,
  IMiddleware
} from '../Interface';
import {Crypto} from '../../Crypto';

export class CryptoMiddleware extends IMiddleware {

  _direction = null;

  _cipher = null;

  _decipher = null;

  _set_iv_after = null;

  next = null;

  constructor(props) {
    super(props);
    this._direction = props.direction;
    this.onFinished = this.onFinished.bind(this);
    this.updateCiphers();
  }

  write(buffer) {
    return new Promise((next) => {
      const direction = this._direction;

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

  deferUpdateCiphers(iv) {
    this._set_iv_after = this.updateCiphers.bind(this, iv);
  }

  onFinished(buffer) {
    this.next(buffer);
    if (this._set_iv_after !== null) {
      this._set_iv_after();
      this._set_iv_after = null;
    }
  }

}
