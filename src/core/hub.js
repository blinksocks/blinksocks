import cluster from 'cluster';
import EventEmitter from 'events';
import net from 'net';
import tls from 'tls';
import ws from 'ws';
import {Balancer} from './balancer';
import {Config} from './config';
import * as MiddlewareManager from './middleware';
import {createRelay} from '../transports';
import {logger} from '../utils';

/**
 * @description
 *   gather and manage connections.
 *
 * @events
 *   .on('close');
 */
export class Hub extends EventEmitter {

  _isFirstWorker = cluster.worker ? (cluster.worker.id <= 1) : true;

  _server = null;

  _fastestServer = null;

  _relays = [];

  constructor(config) {
    super();
    this._onConnection = this._onConnection.bind(this);
    this._onClose = this._onClose.bind(this);
    if (config !== undefined) {
      Config.init(config);
    }
  }

  async run() {
    if (this._server !== null) {
      this.terminate();
    }
    this._server = await this._createServer();
    if (this._isFirstWorker) {
      logger.info(`==> [hub] use configuration: ${JSON.stringify(__ALL_CONFIG__)}`);
      logger.info(`==> [hub] running as: ${__IS_SERVER__ ? 'server' : 'client'}`);
    }
    if (__IS_CLIENT__) {
      this._isFirstWorker && logger.info('==> [balancer] started');
      Balancer.start(__SERVERS__);
    }
  }

  terminate() {
    this._onClose();
  }

  async _createServer() {
    const address = {
      host: __LOCAL_HOST__,
      port: __LOCAL_PORT__
    };
    return new Promise((resolve) => {
      let server = null;
      // for server, server type depends on "transport" specified by user
      if (__IS_SERVER__) {
        // create tls server
        if (__TRANSPORT__ === 'tls') {
          server = tls.createServer({key: [__TLS_KEY__], cert: [__TLS_CERT__]});
          server.on('secureConnection', this._onConnection);
          server.on('close', this._onClose);
          server.listen(address, () => resolve(server));
          return;
        }
        // create websocket server
        if (__TRANSPORT__ === 'websocket') {
          server = new ws.Server({
            ...address,
            perMessageDeflate: false
          });
          // server.on('headers', (headers) => logger.debug(headers));
          server.on('connection', (ws, req) => {
            ws.remoteAddress = req.connection.remoteAddress;
            ws.remotePort = req.connection.remotePort;
            this._onConnection(ws);
          });
          server.on('listening', () => resolve(server));
          // TODO: detect if websocket connection have been closed
          return;
        }
      }
      // server fallback and clients, create tcp server
      server = net.createServer();
      server.on('connection', this._onConnection);
      server.on('close', this._onClose);
      server.listen(address, () => resolve(server));
    });
  }

  _selectServer() {
    const server = Balancer.getFastest();
    if (this._fastestServer === null || server.id !== this._fastestServer.id) {
      this._fastestServer = server;
      Config.initServer(server);
      MiddlewareManager.reset();
      logger.info(`[balancer] use: ${server.host}:${server.port}`);
    }
  }

  _onConnection(context) {
    if (__IS_CLIENT__) {
      this._selectServer();
    }
    const relay = createRelay(__TRANSPORT__, context);
    relay.on('close', () => this._onRelayClose(relay.id));
    logger.verbose(`[hub] [${context.remoteAddress}:${context.remotePort}] connected`);
    this._relays.push(relay);
  }

  _onRelayClose(id) {
    this._relays = this._relays.filter((relay) => relay.id !== id);
  }

  _onClose() {
    if (this._server !== null) {
      // relays
      this._relays.forEach((relay) => relay.destroy());
      this._relays = null;
      MiddlewareManager.cleanup();
      // balancer
      if (__IS_CLIENT__) {
        Balancer.destroy();
        this._isFirstWorker && logger.info('==> [balancer] stopped');
      }
      // server
      this._server.close();
      this._server = null;
      this._isFirstWorker && logger.info('==> [hub] shutdown');
      this.emit('close');
    }
  }

}
