import dgram from 'dgram';
import net from 'net';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import tls from 'tls';
import ws from 'ws';
import LRU from 'lru-cache';
import uniqueId from 'lodash.uniqueid';
import isPlainObject from 'lodash.isplainobject';
import Config from './config';
import { Relay } from './relay';
import { MuxRelay } from './mux-relay';
import { dumpHex, logger } from '../utils';
import { http as httpProxy, socks, tcp } from '../proxies';

export default class Hub {

  _config = null;

  _tcpServer = null;
  _udpServer = null;

  _tcpRelays = new Map(/* id: <Relay> */);
  _udpRelays = null; // LRU cache

  _udpCleanerTimer = null;

  constructor(config) {
    this._config = isPlainObject(config) ? new Config(config) : config;
    this._udpRelays = LRU({ max: 500, maxAge: 1e5, dispose: (_, relay) => relay.destroy() });
  }

  // public interfaces

  async run() {
    await this._config._ready;
    // terminate if it already started
    if (this._tcpServer !== null) {
      await this.terminate();
    }
    // create then listen
    await this._createServer();
  }

  async terminate() {
    // udp relays
    this._udpRelays.reset();
    // tcp relays
    this._tcpRelays.forEach((relay) => relay.destroy());
    this._tcpRelays.clear();
    // udp server
    this._udpServer && this._udpServer.close();
    // server
    this._tcpServer.close();
    // others
    clearInterval(this._udpCleanerTimer);
    logger.info('[hub] shutdown');
  }

  // private methods

  async _createServer() {
    const { is_client, is_server, local_protocol, mux } = this._config;
    if (mux) {
      logger.info('[hub] multiplexing enabled');
    }
    if (is_client) {
      this._tcpServer = await this._createServerOnClient();
    } else {
      this._tcpServer = await this._createServerOnServer();
    }
    if (is_server || ['socks', 'socks5'].includes(local_protocol)) {
      this._udpServer = await this._createUdpServer();
    }
  }

  async _createServerOnClient() {
    return new Promise((resolve, reject) => {
      const { local_protocol, local_search_params, local_host, local_port, local_pathname } = this._config;
      const { local_username: username, local_password: password } = this._config;
      const { https_key, https_cert } = this._config;
      let server = null;
      switch (local_protocol) {
        case 'tcp': {
          const forward = local_search_params.get('forward');
          const { hostname, port } = new URL('tcp://' + forward);
          const forwardHost = hostname;
          const forwardPort = +port;
          server = tcp.createServer({ forwardHost, forwardPort });
          break;
        }
        case 'socks':
        case 'socks5':
        case 'socks4':
        case 'socks4a':
          server = socks.createServer({
            bindAddress: local_host,
            bindPort: local_port,
            username,
            password,
          });
          break;
        case 'http':
        case 'https':
          server = httpProxy.createServer({
            secure: local_protocol === 'https',
            https_key,
            https_cert,
            username,
            password,
          });
          break;
        default:
          return reject(Error(`unsupported protocol: "${local_protocol}"`));
      }
      const address = {
        host: local_host,
        port: local_port,
      };
      server.on('proxyConnection', this._onClientConnection);
      server.on('error', reject);
      server.listen(address, () => {
        const service = `${local_protocol}://${local_host}:${local_port}` + (local_pathname ? local_pathname : '');
        logger.info(`[hub] blinksocks client is running at ${service}`);
        resolve(server);
      });
    });
  }

  async _createServerOnServer() {
    const { local_protocol, local_host, local_port, local_pathname, tls_key, tls_cert } = this._config;
    return new Promise((resolve, reject) => {
      let server = null;
      switch (local_protocol) {
        case 'tcp': {
          server = net.createServer();
          server.on('connection', this._onServerConnection);
          break;
        }
        case 'wss':
        case 'ws': {
          if (local_protocol === 'wss') {
            server = https.createServer({ key: tls_key, cert: tls_cert });
          } else {
            server = http.createServer();
          }
          const wss = new ws.Server({
            server: server,
            path: local_pathname,
            perMessageDeflate: false,
          });
          wss.getConnections = wss._server.getConnections.bind(wss._server);
          wss.on('connection', (ws, req) => {
            ws.remoteAddress = req.connection.remoteAddress;
            ws.remotePort = req.connection.remotePort;
            this._onServerConnection(ws);
          });
          break;
        }
        case 'tls': {
          server = tls.createServer({ key: tls_key, cert: tls_cert });
          server.on('secureConnection', this._onServerConnection);
          break;
        }
        case 'h2': {
          server = require('http2').createSecureServer({ key: tls_key, cert: tls_cert });
          server.on('stream', (stream) => this._onServerConnection(stream));
          break;
        }
        default:
          return reject(Error(`unsupported protocol: "${local_protocol}"`));
      }
      const address = {
        host: local_host,
        port: local_port,
      };
      server.on('error', reject);
      server.listen(address, () => {
        const service = `${local_protocol}://${local_host}:${local_port}` + (local_pathname ? local_pathname : '');
        logger.info(`[hub] blinksocks server is running at ${service}`);
        resolve(server);
      });
    });
  }

  async _createUdpServer() {
    return new Promise((resolve, reject) => {
      const relays = this._udpRelays;
      const server = dgram.createSocket('udp4');

      // destroy old relays every 5s
      clearInterval(this._udpCleanerTimer);
      this._udpCleanerTimer = setInterval(() => relays.prune(), 5e3);

      server.on('message', (msg, rinfo) => {
        const { address, port } = rinfo;
        let proxyRequest = null;
        let packet = msg;
        if (this._config.is_client) {
          const parsed = socks.parseSocks5UdpRequest(msg);
          if (parsed === null) {
            logger.warn(`[hub] [${address}:${port}] drop invalid udp packet: ${dumpHex(msg)}`);
            return;
          }
          const { host, port, data } = parsed;
          proxyRequest = { host, port };
          packet = data;
        }
        const key = `${address}:${port}`;
        let relay = relays.get(key);
        if (relay === undefined) {
          const source = { host: address, port: port };
          const context = { conn: server, source };
          relay = this._createUdpRelay(source);
          if (this._config.is_client) {
            relay.addInboundOnClient(context, proxyRequest);
          } else {
            relay.addInboundOnServer(context);
          }
          relays.set(key, relay);
        }
        if (relay._inbound) {
          relay._inbound.onReceive(packet, rinfo);
        }
      });

      server.on('error', reject);

      // monkey patch for Socket.send() to meet Socks5 protocol
      if (this._config.is_client) {
        server.send = ((send) => (data, port, host, isSs, ...args) => {
          let packet = null;
          if (isSs) {
            // compatible with shadowsocks udp addressing
            packet = Buffer.from([0x00, 0x00, 0x00, ...data]);
          } else {
            packet = socks.encodeSocks5UdpResponse({ host, port, data });
          }
          send.call(server, packet, port, host, ...args);
        })(server.send);
      }

      server.bind({ address: this._config.local_host, port: this._config.local_port }, () => {
        const service = `udp://${this._config.local_host}:${this._config.local_port}`;
        logger.info(`[hub] blinksocks udp server is running at ${service}`);
        resolve(server);
      });
    });
  }

  _onClientConnection = (conn, proxyRequest) => {
    const source = this._getSourceAddress(conn);

    logger.verbose(`[hub] [${source.host}:${source.port}] connected`);

    const context = { conn, source };

    // keep just one relay in mux mode
    if (this._config.mux && this._tcpRelays.size > 0) {
      const { value: relay } = this._tcpRelays.values().next();
      relay.addInboundOnClient(context, proxyRequest);
      return;
    }

    // create a relay for the current connection
    const relay = this._createRelay(source);
    relay.__id = uniqueId('relay_');
    relay.on('close', () => this._onConnectionClose(relay.__id));
    relay.addInboundOnClient(context, proxyRequest);

    this._tcpRelays.set(relay.__id, relay);
  };

  _onServerConnection = (conn) => {
    const source = this._getSourceAddress(conn);

    logger.verbose(`[hub] [${source.host}:${source.port}] connected`);

    // create a relay for the current connection
    const relay = this._createRelay(source);
    relay.__id = uniqueId('relay_');
    relay.on('close', () => this._onConnectionClose(relay.__id));
    relay.addInboundOnServer({ source, conn });

    this._tcpRelays.set(relay.__id, relay);
  };

  _onConnectionClose(id) {
    this._tcpRelays.delete(id);
  }

  _getSourceAddress(conn) {
    let sourceHost, sourcePort;
    if (conn.session) {
      sourceHost = conn.session.socket.remoteAddress;
      sourcePort = conn.session.socket.remotePort;
    } else {
      sourceHost = conn.remoteAddress;
      sourcePort = conn.remotePort;
    }
    return { host: sourceHost, port: sourcePort };
  }

  _createRelay(source) {
    const props = {
      source: source,
      config: this._config,
      transport: this._config.server_protocol,
      presets: this._config.presets,
    };
    return this._config.mux ? new MuxRelay(props) : new Relay(props);
  }

  _createUdpRelay(source) {
    return new Relay({ source, config: this._config, transport: 'udp', presets: this._config.udp_presets });
  }

}
