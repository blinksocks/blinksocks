import net from 'net';
import logger from './logger';

const QUERY_INTERVAL = 12e4; // 2min

const now = () => (new Date()).getTime();

export class Balancer {

  static _servers = [];

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
    this._servers = servers;
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
   * @returns {{host, port}}
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
    return this._servers[index];
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
    this._servers.map((server, i) => {
      const sstr = `${server.host}:${server.port}`;
      logger.verbose(`[balancer] querying ${sstr}`);
      const startTime = now();
      const socket = net.connect({host: server.host, port: server.port}, () => {
        const ping = now() - startTime;
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
