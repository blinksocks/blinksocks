import cluster from 'cluster';
import EventEmitter from 'events';
import net from 'net';
import tls from 'tls';
import ws from 'ws';
import {Balancer} from './balancer';
import {Config} from './config';
import * as MiddlewareManager from './middleware';
import {createRelay} from './relay';
import {logger} from '../utils';
import {tcp, http, socks} from '../proxies';

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
      logger.info(`[hub] blinksocks ${__IS_CLIENT__ ? 'client' : 'server'} running at ${__LOCAL_PROTOCOL__}://${__LOCAL_HOST__}:${__LOCAL_PORT__}`);
    }
    if (__IS_CLIENT__) {
      this._isFirstWorker && logger.info('[balancer] started');
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
      if (__IS_CLIENT__) {
        if (['tcp'].includes(__LOCAL_PROTOCOL__)) {
          server = tcp.createServer();
        }
        else if (['socks', 'socks4', 'socks4a', 'socks5'].includes(__LOCAL_PROTOCOL__)) {
          server = socks.createServer();
        }
        else if (['http', 'https'].includes(__LOCAL_PROTOCOL__)) {
          server = http.createServer();
        }
        server.on('proxyConnection', this._onConnection);
        server.on('close', this._onClose);
        server.listen(address, () => resolve(server));
      } else {
        if (__LOCAL_PROTOCOL__ === 'tcp') {
          server = net.createServer();
          server.on('connection', this._onConnection);
          server.on('close', this._onClose);
          server.listen(address, () => resolve(server));
        }
        else if (__LOCAL_PROTOCOL__ === 'ws') {
          const server = new ws.Server({
            ...address,
            perMessageDeflate: false
          });
          server.on('connection', (ws, req) => {
            ws.remoteAddress = req.connection.remoteAddress;
            ws.remotePort = req.connection.remotePort;
            this._onConnection(ws);
          });
          server.on('listening', () => resolve(server));
        }
        else if (__LOCAL_PROTOCOL__ === 'tls') {
          const server = tls.createServer({key: [__TLS_KEY__], cert: [__TLS_CERT__]});
          server.on('secureConnection', this._onConnection);
          server.on('close', this._onClose);
          server.listen(address, () => resolve(server));
        }
      }
    });
  }

  _selectServer() {
    const server = Balancer.getFastest();
    if (this._fastestServer === null || server.id !== this._fastestServer.id) {
      this._fastestServer = server;
      Config.initServer(server);
      MiddlewareManager.reset();
      logger.info(`[balancer] use server: ${__SERVER_HOST__}:${__SERVER_PORT__}`);
    }
  }

  _onConnection(context, proxyRequest = null) {
    if (__IS_CLIENT__) {
      this._selectServer();
    }
    logger.verbose(`[hub] [${context.remoteAddress}:${context.remotePort}] connected`);
    const relay = createRelay(__TRANSPORT__, context, proxyRequest);
    relay.on('close', () => this._onRelayClose(relay.id));
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
        this._isFirstWorker && logger.info('[balancer] stopped');
      }
      // server
      this._server.close();
      this._server = null;
      this._isFirstWorker && logger.info('[hub] shutdown');
      this.emit('close');
    }
  }

}
