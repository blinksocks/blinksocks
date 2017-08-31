import cluster from 'cluster';
import EventEmitter from 'events';
import net from 'net';
import tls from 'tls';
import uniqueId from 'lodash.uniqueid';
import {Balancer} from './balancer';
import {Config} from './config';
import {Relay} from './relay';
import {cleanup} from './middleware';
import {logger} from '../utils';

/**
 * @description
 *   gather and manage connections.
 *
 * @events
 *   .on('close', () => {});
 */
export class Hub extends EventEmitter {

  _isFirstWorker = cluster.worker ? (cluster.worker.id <= 1) : true;

  _localServer = null;

  _fastestServer = null;

  _relays = [];

  constructor(config) {
    super();
    this.onConnect = this.onConnect.bind(this);
    this.onClose = this.onClose.bind(this);
    if (config !== undefined) {
      Config.init(config);
    }
    if (this._isFirstWorker) {
      logger.info(`==> [hub] use configuration: ${JSON.stringify(__ALL_CONFIG__)}`);
      logger.info(`==> [hub] running as: ${__IS_SERVER__ ? 'server' : 'client'}`);
    }
    if (__IS_CLIENT__) {
      this._isFirstWorker && logger.info('==> [balancer] started');
      Balancer.start(__SERVERS__);
    }
  }

  async run() {
    const options = {
      host: __LOCAL_HOST__,
      port: __LOCAL_PORT__
    };
    this._localServer = this.createServer();
    this._localServer.on('close', this.onClose);
    return new Promise((resolve) => this._localServer.listen(options, resolve));
  }

  terminate() {
    if (this._localServer === null) {
      return;
    }
    this._localServer.close();
    this._localServer = null;
    this._isFirstWorker && logger.info('==> [hub] shutdown');
    if (__IS_CLIENT__) {
      Balancer.destroy();
      this._isFirstWorker && logger.info('==> [balancer] stopped');
    }
  }

  createServer() {
    if (__IS_SERVER__ && __IS_TLS__) {
      const server = tls.createServer({
        key: [__TLS_KEY__],
        cert: [__TLS_CERT__]
      });
      server.on('secureConnection', this.onConnect);
      return server;
    } else {
      const server = net.createServer();
      server.on('connection', this.onConnect);
      return server;
    }
  }

  selectServer() {
    const server = Balancer.getFastest();
    if (this._fastestServer === null || server.id !== this._fastestServer.id) {
      this._fastestServer = server;
      Config.initServer(server);
      logger.info(`[balancer] use: ${server.host}:${server.port}`);
    }
  }

  onConnect(socket) {
    if (__IS_CLIENT__) {
      this.selectServer();
    }
    const id = uniqueId();
    const relay = new Relay({socket});
    relay.id = id;
    relay.on('close', () => {
      this._relays = this._relays.filter((relay) => relay.id !== id);
    });
    this._relays.push(relay);
    logger.verbose(`[hub] [${socket.remoteAddress}:${socket.remotePort}] connected`);
  }

  onClose() {
    this._relays.forEach((relay) => relay.destroy());
    this._relays = null;
    this._localServer = null;
    cleanup();
    this.emit('close');
  }

}
