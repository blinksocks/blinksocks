import dgram from 'dgram';
import log4js from 'log4js';
import {Address} from '../Address';
import {Config} from '../Config';
import {Crypto} from '../Crypto';
import {DNSCache} from '../DNSCache';
import {Encapsulator} from '../Encapsulator';

const Logger = log4js.getLogger('UdpRelay');
const dnsCache = DNSCache.create();

/**
 * return 6 length hash string of a buffer, for debugging
 * @param buffer
 * @returns {string}
 */
function hash(buffer) {
  return Crypto.hash(buffer).slice(0, 6);
}

export class UdpRelay {

  _id = null;

  _lsocket = null; // backward net.Socket

  _socket = null; // forward net.Socket

  _iv = null;

  _cipher = null;

  _decipher = null;

  constructor(options) {
    Logger.setLevel(Config.log_level);
    this._id = options.id;
    this._lsocket = options.socket;
    this._socket = dgram.createSocket('udp4');
    this._socket.on('message', (msg/* , rinfo */) => this.onReceiving(msg));
  }

  onReceiving(msg) {
    if (Config.isServer) {
      this._cipher.write(msg);
    } else {
      this._decipher.write(msg);
    }
  }

  onReceived(msg) {
    if (Config.isServer) {
      this.backwardToClient(msg);
    } else {
      this.backwardToApplication(msg);
    }
  }

  /**
   * backward data to out client
   * @param encrypted
   */
  backwardToClient(encrypted) {
    if (Logger.isInfoEnabled()) {
      const logs = [
        `[${this._id}]`,
        `${encrypted.length} bytes(encrypted,${hash(encrypted)})`
      ];
      Logger.info(logs.join(' <-udp- '));
    }

    this._lsocket.write(encrypted);
  }

  /**
   * backward data to applications
   * @param data
   */
  backwardToApplication(data) {
    if (Logger.isInfoEnabled()) {
      const logs = [
        `[${this._id}]`,
        `${data.length} bytes(decrypted,${hash(data)})`
      ];
      Logger.info(logs.join(' <-udp- '));
    }
    this._lsocket.write(data);
  }

  /**
   * forward data to our server
   * @param encrypted
   */
  async forwardToServer(encrypted) {
    const [host, port] = [Config.server_host, Config.server_port];
    const ip = await dnsCache.get(host);

    this._socket.send(encrypted, port, ip);
    if (Logger.isInfoEnabled()) {
      const logs = [
        `[${this._id}]`,
        `${encrypted.length} bytes (+header,encrypted,${hash(encrypted)})`
      ];
      Logger.info(logs.join(' -udp-> '));
    }
  }

  /**
   * forward data to real server
   * @param decrypted
   */
  async forwardToDst(decrypted) {
    const frame = Encapsulator.unpack(decrypted);
    if (frame === null) {
      if (Logger.isWarnEnabled()) {
        Logger.warn(`[${this._id}] -x-> dropped unidentified packet ${decrypted.length} bytes`);
      }
      return;
    }
    const data = frame.DATA;
    const addr = new Address({
      ATYP: frame.ATYP,
      DSTADDR: frame.DSTADDR,
      DSTPORT: frame.DSTPORT
    });
    const [host, port] = addr.getEndPoint();
    const ip = await dnsCache.get(host);

    this._socket.send(data, port, ip);
    if (Logger.isInfoEnabled()) {
      const logs = [
        `[${this._id}]`,
        `${decrypted.length} bytes(decrypted,${hash(decrypted)})`,
        `${data.length} bytes(-header,${hash(data)})`
      ];
      Logger.info(logs.join(' -udp-> '));
    }
  }

  /**
   * update _cipher and _decipher, with iv if necessary
   */
  updateCiphers() {
    const collector = (buffer) => this.onReceived(buffer);
    const iv = this._iv === null ? undefined : this._iv;
    this._cipher = Crypto.createCipher(collector, iv);
    this._decipher = Crypto.createDecipher(collector, iv);
  }

  /**
   * set initialization vector
   * @param iv
   */
  setIV(iv) {
    this._iv = iv;
  }

}
