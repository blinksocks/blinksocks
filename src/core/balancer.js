import net from 'net';
import url from 'url';
import {logger} from '../utils';

const QUERY_INTERVAL = 12e4; // 2min

export class Balancer {

  static _servers = []; // server list

  static _server = null; // current server

  static _pings = [];

  static _timer = null;

  // public

  /**
   * initialize the balancer with server list and query interval
   * @param servers
   * @param interval
   */
  static start(servers, interval = QUERY_INTERVAL) {
    if (servers.length < 1) {
      throw Error('servers cannot be empty');
    }
    this._servers = servers.map((server, i) => ({id: i, ...server}));
    this._pings = this._servers.map(() => 0);
    this._startQuery(interval);
  }

  /**
   * stop querying
   */
  static destroy() {
    this._stopQuery();
  }

  /**
   * returns the fastest server
   * @returns {*}
   */
  static getFastest() {
    let index = 0;
    const pings = this._pings;
    for (let i = 0; i < pings.length; ++i) {
      const ping = pings[i];
      if ((ping > 0 && ping < pings[index]) || pings[index] <= 0) {
        index = i;
      }
    }
    const server = this._servers[index];
    if (!this._server || (this._server.id !== server.id)) {
      return this._server = server;
    } else {
      return null; // null indicates to keep use the previous one
    }
  }

  // private

  static _startQuery(interval) {
    if (this._servers.length > 1) {
      if (this._timer !== null) {
        this._stopQuery();
      }
      this._timer = setInterval(() => this._query(), interval);
      this._query();
    }
  }

  static _stopQuery() {
    clearInterval(this._timer);
    this._timer = null;
  }

  static _query() {
    this._servers.forEach((server, i) => {
      let _host, _port;
      if (server.service) {
        const {hostname: host, port} = url.parse(server.service);
        _host = host;
        _port = +port;
      } else {
        _host = server.host;
        _port = server.port;
      }
      const sstr = `${_host}:${_port}`;
      logger.verbose(`[balancer] querying ${sstr}`);
      const startTime = Date.now();
      const socket = net.connect({host: _host, port: _port}, () => {
        const ping = Date.now() - startTime;
        this._pings[i] = ping;
        logger.verbose(`[balancer] ${sstr} = ${ping}ms`);
        socket.end();
      });
      socket.on('error', () => {
        this._pings[i] = -1;
        logger.warn(`[balancer] ${sstr} lost connection`);
      });
    });
  }

}
