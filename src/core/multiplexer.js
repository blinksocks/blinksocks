import {Relay} from './relay';
import {getRandomInt, logger} from '../utils';
import uniqueId from 'lodash.uniqueid';

// TODO: consider to adjust MAX_BUFFERED_SIZE dynamic for mux relay?
export class Multiplexer {

  _relays = new Map(/* <id>: <relay> */);

  _muxRelays = new Map(/* <id>: <relay> */);

  constructor() {
    this.onNewSubConn = this.onNewSubConn.bind(this);
    this.onSubConnEncode = this.onSubConnEncode.bind(this);
    this.onDataFrame = this.onDataFrame.bind(this);
    this.onSubConnCloseBySelf = this.onSubConnCloseBySelf.bind(this);
    this.onSubConnCloseByProtocol = this.onSubConnCloseByProtocol.bind(this);
    this.onMuxConnClose = this.onMuxConnClose.bind(this);
  }

  // client only

  couple({relay, remoteInfo, proxyRequest}) {
    const muxRelay = this.getMuxRelay() || this.createMuxRelay(remoteInfo);
    if (!muxRelay.isOutboundReady()) {
      muxRelay.init({proxyRequest});
    } else {
      proxyRequest.onConnected();
    }
    const cid = relay.id;
    relay.injectMethodsToBounds({
      getOutbound() {
        return muxRelay.getOutbound();
      }
    });
    // tell mux preset target host and port(proxyRequest) at the first frame
    relay.once('encode', (buffer) => {
      muxRelay.encode(buffer, {...proxyRequest, cid});
      // then, just encode data stream through mux relay
      relay.on('encode', (buf) => this.onSubConnEncode(muxRelay, buf, cid));
    });
    relay.on('close', () => this.onSubConnCloseBySelf(muxRelay, cid));

    // create relations between mux relay and its sub relays,
    // when mux relay destroyed, all sub relays should be destroyed as well.
    muxRelay.__associateRelays.set(cid, relay);

    this._relays.set(cid, relay);
    logger.debug(`[mux] mix sub connection(cid=${cid}) into mux connection(id=${muxRelay.id}), total: ${this._muxRelays.size}`);
  }

  createMuxRelay(remoteInfo) {
    const relay = new Relay({transport: __TRANSPORT__, remoteInfo, presets: __PRESETS__, isMux: true});
    const id = uniqueId() | 0;
    relay.id = id;
    relay.__associateRelays = new Map();
    relay.on('muxDataFrame', this.onDataFrame);
    relay.on('muxCloseConn', this.onSubConnCloseByProtocol);
    relay.on('close', () => this.onMuxConnClose(relay));
    this._muxRelays.set(id, relay);
    logger.debug(`[mux] create mux connection(id=${id}), total: ${this._muxRelays.size}`);
    return relay;
  }

  // server only

  decouple({relay: muxRelay, remoteInfo}) {
    muxRelay.__associateRelays = new Map();
    muxRelay.on('muxNewConn', (args) => this.onNewSubConn({...args, remoteInfo}));
    muxRelay.on('muxDataFrame', this.onDataFrame);
    muxRelay.on('muxCloseConn', this.onSubConnCloseByProtocol);
    muxRelay.on('close', () => this.onMuxConnClose(muxRelay));
    this._muxRelays.set(muxRelay.id, muxRelay);
  }

  onNewSubConn({cid, host, port, remoteInfo}) {
    const relay = new Relay({transport: __TRANSPORT__, remoteInfo, presets: []});
    relay.__pendingFrames = [];
    const proxyRequest = {
      host: host,
      port: port,
      onConnected: () => {
        logger.debug(`[mux] flush ${relay.__pendingFrames.length} pending frames`);
        for (const frame of relay.__pendingFrames) {
          relay.decode(frame);
        }
        relay.__pendingFrames = null;
      }
    };
    const muxRelay = this.getMuxRelay();
    if (muxRelay) {
      relay.init({proxyRequest});
      relay.id = cid;
      relay.injectMethodsToBounds({
        getInbound() {
          return muxRelay.getInbound();
        }
      });
      relay.on('encode', (buffer) => this.onSubConnEncode(muxRelay, buffer, cid));
      relay.on('close', () => this.onSubConnCloseBySelf(muxRelay, cid));

      // create relations between mux relay and its sub relays,
      // when mux relay destroyed, all sub relays should be destroyed as well.
      muxRelay.__associateRelays.set(cid, relay);

      this._relays.set(cid, relay);
      logger.debug(`[mux] create sub connection(cid=${relay.id}), total: ${this._relays.size}`);
      return relay;
    } else {
      logger.warn('cannot create new sub connection due to no mux relay are available');
    }
  }

  // common

  // TODO: use more intelligent strategy for load balance rather than randomly choose one
  getMuxRelay() {
    const relays = this._muxRelays;
    const concurrency = relays.size;
    if ((__IS_CLIENT__ && concurrency >= __MUX_CONCURRENCY__) || __IS_SERVER__) {
      return relays.get([...relays.keys()][getRandomInt(0, concurrency - 1)]);
    } else {
      return null;
    }
  }

  onSubConnEncode(muxRelay, buffer, cid) {
    muxRelay.encode(buffer, {cid});
  }

  onDataFrame({cid, data}) {
    const relay = this._relays.get(cid);
    if (!relay) {
      logger.error(`[mux] fail to route data frame(size=${data.length}), no such sub connection(cid=${cid})`);
      return;
    }
    if (__IS_CLIENT__ || relay.isOutboundReady()) {
      relay.decode(data);
    } else {
      // TODO: find a way to avoid using relay._pendingFrames
      // cache data frames to the array
      // before sub relay(newly created) established connection to destination
      relay.__pendingFrames = [];
      relay.__pendingFrames.push(data);
    }
  }

  onSubConnCloseBySelf(muxRelay, cid) {
    muxRelay.encode(Buffer.alloc(0), {cid, isClosing: true});
    muxRelay.__associateRelays.delete(cid);
    this._relays.delete(cid);
    logger.debug(`[mux] sub connection(cid=${cid}) closed by self`);
  }

  onSubConnCloseByProtocol({cid}) {
    const relay = this._relays.get(cid);
    if (relay) {
      relay.destroy();
      this._relays.delete(cid);
      logger.debug(`[mux] sub connection(cid=${cid}) closed by protocol`);
    }
    // else {
    //   logger.warn(`[mux] fail to close sub connection, no such sub connection: cid=${cid}`);
    // }
  }

  onMuxConnClose(muxRelay) {
    const subRelays = muxRelay.__associateRelays;
    logger.debug(`[mux] mux connection(id=${muxRelay.id}) is destroyed, cleanup ${subRelays.size} sub connections`);
    // cleanup associate relays
    for (const [, relay] of subRelays) {
      relay.destroy();
    }
    muxRelay.__associateRelays.clear();
    this._muxRelays.delete(muxRelay.id);
  }

}
