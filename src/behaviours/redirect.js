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

  async run({action, remoteHost, remotePort, connect, setPresets}) {
    const {orgData} = action.payload;
    const [host, port] = [this._host, this._port];

    logger.warn(`[behaviour] [${remoteHost}:${remotePort}] connection is redirecting to ${host}:${port}`);

    // replace presets to tracker only
    setPresets((/* prevPresets */) => [{name: 'tracker'}]);

    // connect to "redirect" target
    const fsocket = await connect({host, port});
    if (fsocket && fsocket.writable) {
      fsocket.write(orgData);
    }
  }

}
