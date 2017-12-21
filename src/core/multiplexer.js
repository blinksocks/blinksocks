import {Relay} from './relay';
import {getRandomInt, logger, generateMutexId} from '../utils';

// TODO: give shorter timeout for mux relay
export class Multiplexer {

  _relays = new Map(/* <cid>: <relay> */);

  _muxRelays = new Map(/* <cid>: <relay> */);

  // ------------ on client side ------------

  couple(relay, proxyRequest) {
    let muxRelay = this.getMuxRelay();
    if (muxRelay) {
      proxyRequest.onConnected();
    } else {
      muxRelay = this.createMuxRelay();
      muxRelay.init({proxyRequest});
    }
    let isNewConnSent = false;
    relay.on('encode', (buffer) => {
      if (!isNewConnSent) {
        isNewConnSent = true;
        muxRelay.encode(buffer, {...proxyRequest, cid: relay.id});
      } else {
        muxRelay.encode(buffer, {cid: relay.id});
      }
    });
    relay.on('close', () => {
      muxRelay.encode(Buffer.alloc(0), {cid: relay.id, isClosing: true});
      this._relays.delete(relay.id);
    });
    this._relays.set(relay.id, relay);
    logger.debug(`[mux] mix relay cid=${relay.id} into mux relay ${muxRelay.id}`);
  }

  getMuxRelay() {
    const relays = this._muxRelays;
    const concurrency = relays.size;
    let relay = null;
    if (concurrency >= __MUX_CONCURRENCY__) {
      // randomly pick one
      relay = relays.get([...relays.keys()][getRandomInt(0, concurrency - 1)]);
    }
    return relay;
  }

  createMuxRelay() {
    const relay = new Relay({transport: 'mux', presets: [{'name': 'mux'}], isMux: true});
    // relay.init();
    relay.id = generateMutexId([...this._muxRelays.keys()], __MUX_CONCURRENCY__);
    relay.on('close', () => {
      this._muxRelays.delete(relay.id);
      logger.debug(`[mux] mux relay ${relay.id} is destroyed`);
    });
    relay.on('muxDataFrame', (args) => this.onClientDataFrame(args));
    this._muxRelays.set(relay.id, relay);
    logger.debug(`[mux] create mux relay ${relay.id}`);
    return relay;
  }

  onClientDataFrame({cid, data}) {
    const relay = this._relays.get(cid);
    if (!relay) {
      logger.error(`[mux] fail to route data frame, no such sub relay: cid=${cid}`);
      return;
    }
    relay.decode(data);
  }

  // ------------ on server side ------------

  decouple(muxRelay) {
    muxRelay.on('muxNewConn', (args) => this.onNewConnection(muxRelay, args));
    muxRelay.on('muxDataFrame', (args) => this.onServerDataFrame(args));
    muxRelay.on('muxCloseConn', (args) => this.onSubConnClose(args));
    muxRelay.on('close', () => this.onMuxRelayClose(muxRelay));
    this._muxRelays.set(muxRelay.id, muxRelay);
  }

  onNewConnection(muxRelay, {cid, host, port}) {
    const relay = new Relay({transport: __TRANSPORT__, presets: __PRESETS__});
    const proxyRequest = {
      host: host,
      port: port,
      onConnected: () => {
        for (const frame of relay._pendingFrames) {
          relay.decode(frame);
        }
        relay._pendingFrames = null;
      }
    };
    relay.init({proxyRequest});
    relay.id = cid;
    relay.on('close', () => this._relays.delete(cid));

    // TODO: choose a random mux relay?
    relay.on('encode', (buffer) => muxRelay.encode(buffer, {cid}));

    this._relays.set(cid, relay);
    logger.debug(`[mux] create sub relay cid=${relay.id}, total: ${this._relays.size}`);
    return relay;
  }

  onServerDataFrame({cid, data}) {
    const relay = this._relays.get(cid);
    if (!relay) {
      logger.error(`[mux] fail to route data frame, no such sub relay: cid=${cid}`);
      return;
    }
    if (relay.isOutboundReady()) {
      relay.decode(data);
    } else {
      // TODO: refactor relay._pendingFrames
      // cache data frames to the array
      // before new sub relay established connection to destination
      relay._pendingFrames = [];
      relay._pendingFrames.push(data);
    }
  }

  onSubConnClose({cid}) {
    const relay = this._relays.get(cid);
    if (relay) {
      relay.destroy();
      this._relays.delete(cid);
    } else {
      logger.warn(`[mux] fail to close sub connection, no such relay: cid=${cid}`);
    }
  }

  onMuxRelayClose(muxRelay) {
    logger.debug(`[mux] mux relay ${muxRelay.id} is destroyed`);
    this._muxRelays.delete(muxRelay.id);
    // TODO: cleanup associate relays?
  }

}
