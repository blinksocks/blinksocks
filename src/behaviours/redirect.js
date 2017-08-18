import {Logger, isValidHostname, isValidPort} from '../utils';

let logger = null;

export default class RedirectBehaviour {

  _host = '';

  _port = '';

  constructor({host, port}) {
    logger = Logger.getInstance();
    if (!isValidHostname(host)) {
      throw Error('\'host\' is invalid');
    }
    if (!isValidPort(port)) {
      throw Error('\'port\' is invalid');
    }
    this._host = host;
    this._port = port;
  }

  async run({action, remoteAddr, bsocket, fsocket, connect}) {
    const {orgData} = action.payload;
    const [host, port] = [this._host, this._port];

    logger.warn(`[behaviour] [${remoteAddr}] connection is redirecting to ${host}:${port}...`);

    bsocket && bsocket.pause();
    fsocket && fsocket.pause();

    // close living connection
    if (fsocket && !fsocket.destroyed) {
      fsocket.destroy();
    }

    // TODO(fix): lost traffic track here, consider changing presets to [tunnel, tracker] for example

    // connect to redirect target
    const _fsocket = await connect({host, port});
    if (_fsocket && _fsocket.writable) {
      _fsocket.write(orgData);
    }

    _fsocket.removeAllListeners('data');
    _fsocket.on('data', (buffer) => {
      // TODO: take care of bufferSize?
      if (bsocket && bsocket.writable) {
        bsocket.write(buffer);
      }
    });

    bsocket.removeAllListeners('data');
    bsocket.on('data', (buffer) => {
      if (_fsocket && _fsocket.writable) {
        _fsocket.write(buffer);
      }
    });
  }

}
