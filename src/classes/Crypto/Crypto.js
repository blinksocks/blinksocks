import crypto from 'crypto';
import {Config} from '../Config';

const HASH_SALT = 'blinksocks';

/**
 * encrypt/decrypt data by a cipher/key obtained from config.json
 */
export class Crypto {

  static encrypt(plainText) {
    const [cipherName, key] = [Config.cipher, Config.key];
    if (cipherName === '') {
      return plainText;
    } else {
      const cipher = crypto.createCipher(cipherName, key);
      return Buffer.concat([cipher.update(plainText), cipher.final()]);
    }
  }

  static decrypt(cipherText) {
    const [cipherName, key] = [Config.cipher, Config.key];
    if (cipherName === '') {
      return cipherText;
    } else {
      const decipher = crypto.createDecipher(cipherName, key);
      return Buffer.concat([decipher.update(cipherText), decipher.final()]);
    }
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
