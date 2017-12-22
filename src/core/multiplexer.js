import {Relay} from './relay';
import {generateMutexId, getRandomInt, logger} from '../utils';

function getRandomRelay(relays) {
  const concurrency = relays.size;
  return relays.get([...relays.keys()][getRandomInt(0, concurrency - 1)])
}

// TODO: give shorter timeout for mux relay

export class MuxClient {

  _relays = new Map(/* <id>: <relay> */);

  _muxRelays = new Map(/* <id>: <relay> */);

  constructor() {
    this.onSubConnEncode = this.onSubConnEncode.bind(this);
    this.onSubConnClose = this.onSubConnClose.bind(this);
    this.onMuxConnClose = this.onMuxConnClose.bind(this);
    this.onDataFrame = this.onDataFrame.bind(this);
  }

  couple(relay, proxyRequest) {
    const muxRelay = getRandomRelay(this._muxRelays) || this.createMuxRelay();
    if (!muxRelay.isOutboundReady()) {
      muxRelay.init({proxyRequest});
    } else {
      proxyRequest.onConnected();
    }
    const cid = relay.id;
    relay.once('encode', (buffer) => {
      muxRelay.encode(buffer, {...proxyRequest, cid});
      relay.on('encode', (buf) => this.onSubConnEncode(muxRelay, buf, cid));
    });
    relay.on('close', () => this.onSubConnClose(muxRelay, cid));
    this._relays.set(cid, relay);
    logger.debug(`[mux] mix sub connection cid=${cid} into mux connection ${muxRelay.id}`);
  }

  createMuxRelay() {
    const relay = new Relay({transport: 'mux', presets: [{'name': 'mux'}], isMux: true});
    const id = generateMutexId([...this._muxRelays.keys()], __MUX_CONCURRENCY__);
    relay.id = id;
    relay.on('close', () => this.onMuxConnClose(id));
    relay.on('muxDataFrame', this.onDataFrame);
    this._muxRelays.set(id, relay);
    logger.debug(`[mux] create mux connection ${id}`);
    return relay;
  }

  onSubConnEncode(muxRelay, buffer, cid) {
    muxRelay.encode(buffer, {cid});
  }

  onDataFrame({cid, data}) {
    const relay = this._relays.get(cid);
    if (!relay) {
      logger.error(`[mux] fail to route data frame, no such sub connection: cid=${cid}`);
      return;
    }
    relay.decode(data);
  }

  onSubConnClose(muxRelay, cid) {
    muxRelay.encode(Buffer.alloc(0), {cid, isClosing: true});
    this._relays.delete(cid);
  }

  onMuxConnClose(id) {
    this._muxRelays.delete(id);
    logger.debug(`[mux] mux connection ${id} is destroyed`);
  }

}

export class MuxServer {

  _relays = new Map(/* <id>: <relay> */);

  _muxRelays = new Map(/* <id>: <relay> */);

  constructor() {
    this.onNewSubConn = this.onNewSubConn.bind(this);
    this.onDataFrame = this.onDataFrame.bind(this);
    this.onSubConnClose = this.onSubConnClose.bind(this);
    this.onMuxConnClose = this.onMuxConnClose.bind(this);
  }

  decouple(muxRelay) {
    muxRelay.on('muxNewConn', this.onNewSubConn);
    muxRelay.on('muxDataFrame', this.onDataFrame);
    muxRelay.on('muxCloseConn', this.onSubConnClose);
    muxRelay.on('close', () => this.onMuxConnClose(muxRelay.id));
    this._muxRelays.set(muxRelay.id, muxRelay);
  }

  onNewSubConn({cid, host, port}) {
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
    const muxRelay = getRandomRelay(this._muxRelays);

    relay.init({proxyRequest});
    relay.id = cid;
    // relay.on('close', () => this.onSubConnClose({cid}));
    relay.on('encode', (buffer) => this.onSubConnEncode(muxRelay, buffer, cid));

    this._relays.set(cid, relay);
    logger.debug(`[mux] create sub connection cid=${relay.id}, total: ${this._relays.size}`);
    return relay;
  }

  onSubConnEncode(muxRelay, buffer, cid) {
    muxRelay.encode(buffer, {cid});
  }

  onDataFrame({cid, data}) {
    const relay = this._relays.get(cid);
    if (!relay) {
      logger.error(`[mux] fail to route data frame, no such sub connection: cid=${cid}`);
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
      logger.verbose(`[mux] close sub connection: cid=${cid}`);
    } else {
      logger.warn(`[mux] fail to close sub connection, no such connection: cid=${cid}`);
    }
  }

  onMuxConnClose(id) {
    logger.debug(`[mux] mux connection ${id} is destroyed`);
    this._muxRelays.delete(id);
    // TODO: cleanup associate relays?
  }

}
