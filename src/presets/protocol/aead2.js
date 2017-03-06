import crypto from 'crypto';
import logger from 'winston';
import AeadProtocol from './aead';
import {Utils} from '../../utils';

const PADDING_LEN = 6;
const SEQ_LEN = 6;

/**
 * @description
 *   This protocol implementation is based on AeadProtocol(aead.js),
 *   it aims to prevent both client and server from replaying attack.
 *
 * @params
 *   cipher (String): How to encrypt/decrypt the header bytes.
 *   hash (String): A hash method for calculating HMAC.
 *
 * @examples
 *   "protocol": "aead2"
 *   "protocol_params": "aes-128-cbc,sha256"
 *
 * @protocol
 *
 *   # TCP handshake & chunk
 *   +-----------+-----------+-------+----------+-------------------+----------+
 *   |  PADDING  |    SEQ    |  LEN  |  HMAC-A  |      PAYLOAD      |  HMAC-B  |
 *   +-----------+-----------+-------+----------+-------------------+----------+
 *   |     6     |     6     |   4   |  Fixed   |      Variable     |  Fixed   |
 *   +-----------+-----------+-------+----------+-------------------+----------+
 *   |<---------- header ----------->|
 *
 * @explain
 *   1. LEN is the total length of the packet.
 *   2. PADDING is random generated.
 *   3. HMAC-A = mac(encrypt(header)).
 *   4. HMAC-B = mac(encrypt(PAYLOAD)).
 *   5. The length of HMAC depends on message digest algorithm.
 *   6. Encrypt-then-MAC (EtM) is performed for calculating HMAC.
 *   7. SEQ is set to 0 when client make handshake to server.
 *   8. SEQ is random generate by server, then sent to client.
 *   9. SEQ should +1 once a packet is out/received, on both client and server.
 *   10. SEQ is verified on both client and server.
 */
export default class Aead2Protocol extends AeadProtocol {

  _seq; // number

  _isHandshakeDone = false;

  constructor(...params) {
    super(...params);
    if (__IS_SERVER__) {
      this._seq = crypto.randomBytes(SEQ_LEN).readUIntBE(0, SEQ_LEN);
    } else {
      this._seq = 0;
    }
  }

  _out({buffer}) {
    const encBuffer = this.encrypt(buffer);
    const encHeader = this.encrypt(Buffer.concat([
      crypto.randomBytes(PADDING_LEN),
      Utils.numberToUIntBE(this._seq, SEQ_LEN),
      Utils.numberToUIntBE(16 + this._hmacLen + encBuffer.length + this._hmacLen, 4)
    ]), false);
    const hmacA = this.createHmac(encHeader);
    const hmacB = this.createHmac(encBuffer);
    const out = Buffer.concat([encHeader, hmacA, encBuffer, hmacB]);
    if (__IS_CLIENT__) {
      logger.info(`ClientOut(LEN=${out.length}, SEQ=${this._seq}): ${out.slice(0, 60).toString('hex')}`);
    } else {
      logger.info(`ServerOut(LEN=${out.length}, SEQ=${this._seq}): ${out.slice(0, 60).toString('hex')}`);
    }
    this._seq += 1;
    return out;
  }

  onGetLength(buffer) {
    if (buffer.length < (16 + 2 * this._hmacLen)) {
      return 0; // too short, should continue to receive
    }
    const encLen = buffer.slice(0, 16);
    const expHmacA = this.createHmac(encLen);
    const hmacA = buffer.slice(16, 16 + this._hmacLen);
    if (!hmacA.equals(expHmacA)) {
      logger.error(`dropped unexpected packet (${buffer.length} bytes) received from server: wrong HMAC-A ${buffer.slice(0, 60).toString('hex')}`);
      return -1;
    }
    // safely decrypt
    const header = this.decrypt(encLen, false);
    const len = header.readUIntBE(PADDING_LEN + SEQ_LEN, 4);
    const seq = header.readUIntBE(PADDING_LEN, SEQ_LEN);
    // store initial SEQ
    if (!this._isHandshakeDone) {
      if (__IS_CLIENT__) {
        this._seq = seq;
      }
      this._isHandshakeDone = true;
      return len;
    }
    // verify SEQ
    if (this._seq !== seq) {
      logger.error(`dropped unexpected packet (${buffer.length} bytes) received from server: wrong SEQ=${seq} expect=${this._seq}`);
      return -1;
    }
    return len;
  }

  onReceived(packet) {
    if (__IS_CLIENT__) {
      logger.info(`ClientIn(LEN=${packet.length}, SEQ=${this._seq}): ${packet.slice(0, 60).toString('hex')}`);
    } else {
      logger.info(`ServerIn(LEN=${packet.length}, SEQ=${this._seq}): ${packet.slice(0, 60).toString('hex')}`);
    }
    const _packet = packet.slice(16 + this._hmacLen);
    const hmacB = _packet.slice(-this._hmacLen);
    const expHmacB = this.createHmac(_packet.slice(0, -this._hmacLen));
    if (!hmacB.equals(expHmacB)) {
      logger.error(`dropped unexpected packet (${packet.length} bytes) received from ${__IS_CLIENT__ ? 'server' : 'client'}: wrong HMAC-B ${packet.slice(0, 60).toString('hex')}`);
      // TODO: maybe notify to disconnect rather than timeout?
      return;
    }
    const next = __IS_CLIENT__ ? this._bNext : this._fNext;
    next(this.decrypt(_packet.slice(0, -this._hmacLen)));
    this._seq += 1;
  }

}
