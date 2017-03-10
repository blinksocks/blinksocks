import net from 'net';

const QUERY_INTERVAL = 6e4; // 1min

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
  static init(servers, interval = QUERY_INTERVAL) {
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
   * returns the fastest one of the servers
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
    this._timer = setInterval(() => this._servers.map(
      (server, i) => {
        const startTime = now();
        const socket = net.connect(server, () => {
          this._pings[i] = now() - startTime;
          socket.end();
        });
        socket.on('error', () => this._pings[i] = -1);
      }
    ), interval);
  }

  static _stopQuery() {
    clearInterval(this._timer);
  }

}
