import EventEmitter from 'events';
import { ACL, ACL_CLOSE_CONNECTION } from './acl';
import { Pipe } from './pipe';
import { Tracker } from './tracker';
import { getRandomInt, logger } from '../utils';

import {
  TcpInbound, TcpOutbound,
  UdpInbound, UdpOutbound,
  TlsInbound, TlsOutbound,
  Http2Inbound, Http2Outbound,
  WsInbound, WsOutbound,
  WssInbound, WssOutbound,
} from '../transports';

import { PIPE_ENCODE, PIPE_DECODE, CONNECT_TO_REMOTE, PRESET_FAILED } from '../constants';

// .on('_connect')
// .on('_read')
// .on('_write')
// .on('_error')
// .on('close')
export class Relay extends EventEmitter {

  _config = null;

  _acl = null;

  _tracker = null;

  _source = null;

  _transport = null;

  _inbound = null;

  _outbound = null;

  _pipe = null;

  _destroyed = false;

  get destroyed() {
    return this._destroyed;
  }

  constructor({ config, source, transport, presets = [] }) {
    super();
    this._config = config;
    this._transport = transport;
    this._source = source;
    // pipe
    this._pipe = new Pipe({ config, presets, isUdp: transport === 'udp' });
    this._pipe.on('broadcast', this.onBroadcast);
    this._pipe.on(`pre_${PIPE_DECODE}`, this.onPreDecode);
    this._pipe.on(`post_${PIPE_ENCODE}`, this.onEncoded);
    this._pipe.on(`post_${PIPE_DECODE}`, this.onDecoded);
    // acl
    if (config.is_server && config.acl) {
      this._acl = new ACL({ sourceAddress: this._source, rules: config.acl_rules });
      this._acl.on('action', this.onBroadcast);
    }
    // tracker
    this._tracker = new Tracker({ config, transport });
    this._tracker.setSourceAddress(this._source.host, this._source.port);
  }

  async addInboundOnClient(context, proxyRequest) {
    const { source } = context;
    const { host, port, onConnected } = proxyRequest;
    const remote = `${source.host}:${source.port}`;
    const target = `${host}:${port}`;

    this._init(context);
    this._pipe.initTargetAddress({ host, port });
    this._tracker.setTargetAddress(host, port);

    logger.info(`[relay] [${remote}] request: ${target}`);

    await this._outbound.connect();
    try {
      if (typeof onConnected === 'function') {
        onConnected((buffer) => {
          if (buffer) {
            this._inbound.onReceive(buffer);
          }
        });
      }
    } catch (err) {
      logger.error(`[relay] [${remote}] onConnected callback error: ${err.message}`);
      this.emit('_error', err);
    }
  }

  addInboundOnServer(context) {
    this._init(context);
  }

  _init(context) {
    const { Inbound, Outbound } = this._getBounds(this._transport);
    const props = { config: this._config, source: context.source, conn: context.conn };
    const inbound = new Inbound(props);
    const outbound = new Outbound(props);
    this._inbound = inbound;
    this._outbound = outbound;
    // outbound
    this._outbound.setInbound(this._inbound);
    this._outbound.on('_error', (err) => this.emit('_error', err));
    this._outbound.on('data', this.onOutboundReceive);
    this._outbound.on('close', () => this.onBoundClose(outbound, inbound));
    // inbound
    this._inbound.setOutbound(this._outbound);
    this._inbound.on('_error', (err) => this.emit('_error', err));
    this._inbound.on('data', this.onInboundReceive);
    this._inbound.on('close', () => this.onBoundClose(inbound, outbound));
  }

  _getBounds(transport) {
    const mapping = {
      'tcp': [TcpInbound, TcpOutbound],
      'udp': [UdpInbound, UdpOutbound],
      'tls': [TlsInbound, TlsOutbound],
      'h2': [Http2Inbound, Http2Outbound],
      'ws': [WsInbound, WsOutbound],
      'wss': [WssInbound, WssOutbound],
    };
    let Inbound = null, Outbound = null;
    if (transport === 'udp') {
      [Inbound, Outbound] = [UdpInbound, UdpOutbound];
    } else {
      [Inbound, Outbound] = this._config.is_client ? [TcpInbound, mapping[transport][1]] : [mapping[transport][0], TcpOutbound];
    }
    return { Inbound, Outbound };
  }

  // inbound & outbound events

  onInboundReceive = (buffer) => {
    const direction = this._config.is_client ? PIPE_ENCODE : PIPE_DECODE;
    this._pipe.feed(direction, buffer);
  };

  onOutboundReceive = (buffer) => {
    const direction = this._config.is_client ? PIPE_DECODE : PIPE_ENCODE;
    this._pipe.feed(direction, buffer);
  };

  onBoundClose(thisBound, anotherBound) {
    if (anotherBound.__closed) {
      this.destroy();
      this.emit('close');
    } else {
      thisBound.__closed = true;
    }
  }

  // hooks of pipe

  onBroadcast = (action) => {
    if (action.type === CONNECT_TO_REMOTE) {
      return this.onConnectToRemove(action);
    }
    if (action.type === PRESET_FAILED) {
      if (this._acl && this._acl.checkFailTimes(this._config.acl_tries)) {
        return;
      }
      return this.onPresetFailed(action);
    }
    if (action.type === ACL_CLOSE_CONNECTION) {
      const source = this._source;
      const transport = this._transport;
      const remote = `${source.host}:${source.port}`;
      logger.warn(`[relay] [${transport}] [${remote}] acl request to close this connection`);
      this.destroy();
      return;
    }
    this._inbound && this._inbound.onBroadcast(action);
    this._outbound && this._outbound.onBroadcast(action);
  };

  async onConnectToRemove(action) {
    const { host: sourceHost, port: sourcePort } = this._source;
    const { host, port, onConnected } = action.payload;
    const remote = `${sourceHost}:${sourcePort}`;
    const target = `${host}:${port}`;
    this.emit('_connect', action.payload);
    // tracker
    this._tracker.setTargetAddress(host, port);
    // acl
    if (this._acl && this._acl.setTargetAddress(host, port)) {
      return;
    }
    logger.info(`[relay] [${remote}] request: ${target}`);
    if (this._config.is_server) {
      await this._outbound.connect(host, port);
      if (typeof onConnected === 'function') {
        onConnected();
      }
    }
  }

  async onPresetFailed(action) {
    const { name, message, orgData } = action.payload;
    const source = this._source;
    const transport = this._transport;
    const remote = `${source.host}:${source.port}`;

    logger.error(`[relay] [${transport}] [${remote}] preset "${name}" fail to process: ${message}`);
    this.emit('_error', new Error(message));

    // close connection directly on client side
    if (this._config.is_client) {
      logger.warn(`[relay] [${transport}] [${remote}] connection closed`);
      this.destroy();
    }

    // for server side, redirect traffic if "redirect" is set, otherwise, close connection after a random timeout
    if (this._config.is_server) {
      if (this._config.redirect) {
        const [host, port] = this._config.redirect.split(':');

        logger.warn(`[relay] [${transport}] [${remote}] connection is redirecting to: ${host}:${port}`);

        // clear preset list
        this._pipe.updatePresets([]);

        // connect to "redirect" remote
        await this._outbound.connect(host, port, true);
        if (this._outbound.writable) {
          this._outbound.write(orgData);
        }
      } else {
        this._outbound.pause && this._outbound.pause();
        const timeout = getRandomInt(5, 30);
        logger.warn(`[relay] [${transport}] [${remote}] connection will be closed in ${timeout}s...`);
        setTimeout(this.destroy.bind(this), timeout * 1e3);
      }
    }
  }

  // hooks of pipe

  onPreDecode = (buffer, cb) => {
    this._tracker.trace(PIPE_DECODE, buffer.length);
    if (this._acl) {
      this._acl.collect(PIPE_DECODE, buffer.length);
    }
    cb(buffer);
    setImmediate(() => this.emit('_read', buffer.length));
  };

  onEncoded = (buffer) => {
    this._tracker.trace(PIPE_ENCODE, buffer.length);
    if (this._config.is_client) {
      this._outbound.write(buffer);
    } else {
      if (this._acl) {
        this._acl.collect(PIPE_ENCODE, buffer.length);
      }
      this._inbound.write(buffer);
    }
    setImmediate(() => this.emit('_write', buffer.length));
  };

  onDecoded = (buffer) => {
    if (this._config.is_client) {
      this._inbound.write(buffer);
    } else {
      this._outbound.write(buffer);
    }
  };

  destroy() {
    if (!this._destroyed) {
      this._destroyed = true;
      if (this._pipe) {
        this._pipe.destroy();
        this._pipe.removeAllListeners();
        this._pipe = null;
      }
      if (this._inbound) {
        this._inbound.close();
        this._inbound.removeAllListeners();
        this._inbound = null;
      }
      if (this._outbound) {
        this._outbound.close();
        this._outbound.removeAllListeners();
        this._outbound = null;
      }
      if (this._tracker) {
        this._tracker.destroy();
        this._tracker = null;
      }
      if (this._acl) {
        this._acl.destroy();
        this._acl = null;
      }
    }
  }

}
