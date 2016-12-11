import crypto from 'crypto';
import {Config} from '../Config';
import {AdvancedBuffer} from '../AdvancedBuffer';

const HASH_SALT = 'blinksocks';
const CRYPTO_TYPE_CIPHER = 0;
const CRYPTO_TYPE_DECIPHER = 1;
const CRYPTO_TYPE_NONE = 3;

class FakeStream {

  constructor(collector) {
    this.collector = collector;
  }

  static create(collector) {
    return new FakeStream(collector);
  }

  write(buffer) {
    this.collector(buffer);
  }

  on(/* event, callback */) {

  }

}

/**
 * encrypt/decrypt data by a cipher/key obtained from config.json
 */
export class Crypto {

  static _create(type, collector) {
    const [cipher, key] = [Config.cipher, Config.key];

    let stream = null;
    const _type = cipher === '' ? CRYPTO_TYPE_NONE : type;
    switch (_type) {
      case CRYPTO_TYPE_CIPHER:
        stream = crypto.createCipher(cipher, key);
        break;
      case CRYPTO_TYPE_DECIPHER:
        stream = crypto.createDecipher(cipher, key);
        break;
      case CRYPTO_TYPE_NONE:
        stream = FakeStream.create(collector);
        break;
      default:
        throw Error(`unknown type: ${type}`);
    }

    const _buffer = new AdvancedBuffer();
    _buffer.on('data', (data) => collector(data));

    stream.on('readable', () => {
      const data = stream.read();
      if (data !== null) {
        if (Config.isServer && _type === CRYPTO_TYPE_DECIPHER) {
          _buffer.put(data);
        } else {
          collector(data);
        }
      }
    });

    return stream;
  }

  static createCipher(collector) {
    return Crypto._create(CRYPTO_TYPE_CIPHER, collector);
  }

  static createDecipher(collector) {
    return Crypto._create(CRYPTO_TYPE_DECIPHER, collector);
  }

  static hash(text) {
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.concat([
      Buffer.from(text),
      Buffer.from(HASH_SALT)
    ]));
    return hash.digest('hex');
  }

}
