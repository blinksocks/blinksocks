import EventEmitter from 'events';
import { Pipe } from './pipe';
import { Tracker } from './tracker';
import {
  Tracert,
  TRACERT_INBOUND_IN,
  TRACERT_INBOUND_OUT,
  TRACERT_OUTBOUND_IN,
  TRACERT_OUTBOUND_OUT,
  TRACERT_PRESET_FAILED,
  TRACERT_PRESET_CALLBACK_ERROR,
  TRACERT_INBOUND_ERROR,
  TRACERT_OUTBOUND_ERROR,
  TRACERT_INBOUND_CONNECTIONS,
  TRACERT_OUTBOUND_CONNECTIONS,
} from './tracert';
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

// .on('close')
export class Relay extends EventEmitter {

  static inboundCounter = 0;

  static outboundCounter = 0;

  _config = null;

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
    this._pipe.on(`post_${PIPE_ENCODE}`, this.onEncoded);
    this._pipe.on(`post_${PIPE_DECODE}`, this.onDecoded);
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

    Tracert.put(TRACERT_INBOUND_CONNECTIONS, ++Relay.inboundCounter);
    await this._outbound.connect();
    Tracert.put(TRACERT_OUTBOUND_CONNECTIONS, ++Relay.outboundCounter);
    try {
      if (typeof onConnected === 'function') {
        onConnected((buffer) => {
          if (buffer) {
            this._inbound.onReceive(buffer);
          }
        });
      }
    } catch (err) {
      Tracert.put(TRACERT_PRESET_CALLBACK_ERROR, { message: err.message });
      logger.error(`[relay] [${remote}] onConnected callback error: ${err.message}`);
    }
  }

  addInboundOnServer(context) {
    Tracert.put(TRACERT_INBOUND_CONNECTIONS, ++Relay.inboundCounter);
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
    this._outbound.on('_error', (err) => Tracert.put(TRACERT_OUTBOUND_ERROR, { message: err.message }));
    this._outbound.on('data', this.onOutboundReceive);
    this._outbound.on('close', () => {
      Tracert.put(TRACERT_OUTBOUND_CONNECTIONS, --Relay.outboundCounter);
      this.onBoundClose(outbound, inbound);
    });
    // inbound
    this._inbound.setOutbound(this._outbound);
    this._inbound.on('_error', (err) => Tracert.put(TRACERT_INBOUND_ERROR, { message: err.message }));
    this._inbound.on('data', this.onInboundReceive);
    this._inbound.on('close', () => {
      Tracert.put(TRACERT_INBOUND_CONNECTIONS, --Relay.inboundCounter);
      this.onBoundClose(inbound, outbound);
    });
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
    Tracert.put(TRACERT_INBOUND_IN, buffer.length);
    const direction = this._config.is_client ? PIPE_ENCODE : PIPE_DECODE;
    this._pipe.feed(direction, buffer);
  };

  onOutboundReceive = (buffer) => {
    Tracert.put(TRACERT_OUTBOUND_IN, buffer.length);
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
      return this.onPresetFailed(action);
    }
    this._inbound && this._inbound.onBroadcast(action);
    this._outbound && this._outbound.onBroadcast(action);
  };

  async onConnectToRemove(action) {
    const { host: sourceHost, port: sourcePort } = this._source;
    const { host: targetHost, port: targetPort, onConnected } = action.payload;

    const remote = `${sourceHost}:${sourcePort}`;
    const target = `${targetHost}:${targetPort}`;
    logger.info(`[relay] [${remote}] request: ${target}`);

    this._tracker.setTargetAddress(targetHost, targetPort);
    if (this._config.is_server) {
      await this._outbound.connect(targetHost, targetPort);
      Tracert.put(TRACERT_OUTBOUND_CONNECTIONS, ++Relay.outboundCounter);
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

    Tracert.put(TRACERT_PRESET_FAILED, { name, message });

    logger.error(`[relay] [${transport}] [${remote}] preset "${name}" fail to process: ${message}`);

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

  onEncoded = (buffer) => {
    this._tracker.trace(PIPE_ENCODE, buffer.length);
    if (this._config.is_client) {
      Tracert.put(TRACERT_OUTBOUND_OUT, buffer.length);
      this._outbound.write(buffer);
    } else {
      Tracert.put(TRACERT_INBOUND_OUT, buffer.length);
      this._inbound.write(buffer);
    }
  };

  onDecoded = (buffer) => {
    if (this._config.is_client) {
      Tracert.put(TRACERT_INBOUND_OUT, buffer.length);
      this._inbound.write(buffer);
    } else {
      Tracert.put(TRACERT_OUTBOUND_OUT, buffer.length);
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
    }
  }

}
