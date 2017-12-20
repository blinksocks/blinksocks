import {Relay} from './relay';
import {getRandomInt, logger, generateMutexId} from '../utils';
import {CONNECT_TO_REMOTE} from '../presets/defs';

// TODO: give shorter timeout for mux relay
export class Multiplexer {

  _relays = new Map(/* <cid>: <relay> */);

  _muxRelays = new Map(/* <cid>: <relay> */);

  // ------------ on client side ------------

  couple(relay) {
    const muxRelay = this.getMuxRelay(relay.getContext());
    relay.on('encode', muxRelay.onPipeEncoded.bind(muxRelay));
    relay.on('close', () => this._relays.delete(relay.id));
    this._relays.set(relay.id, relay);
    logger.debug(`[mux] mix relay ${relay.id} into mux relay ${muxRelay.id}`);
  }

  getMuxRelay(context) {
    const relays = this._muxRelays;
    const concurrency = relays.size;
    let relay = null;
    if (concurrency < __MUX_CONCURRENCY__) {
      // create mux relay if necessary
      relay = this.createMuxRelay(context);
    } else {
      // or just randomly pick one
      relay = relays.get([...relays.keys()][getRandomInt(0, concurrency - 1)]);
    }
    return relay;
  }

  createMuxRelay(context) {
    const cid = generateMutexId([...this._muxRelays.keys()], __MUX_CONCURRENCY__);
    const relay = new Relay({transport: 'mux', context, presets: [], isMux: true, cid});
    relay.id = cid;
    relay.on('close', () => {
      this._muxRelays.delete(cid);
      logger.debug(`[mux] mux relay ${relay.id} is destroyed`);
    });
    relay.on('muxDataFrame', ({cid, data}) => {
      const leftRelay = this._relays.get(cid);
      if (!leftRelay) {
        logger.error(`[mux] leftRelay ${cid} is not found`);
        return;
      }
      // if (!leftRelay.hasListener('decode')) {
      //   leftRelay.on('decode', muxRelay.onPipeEncoded.bind(muxRelay));
      // }
      leftRelay.onPipeDecoded(data);
    });
    this._muxRelays.set(cid, relay);
    logger.debug(`[mux] create mux relay ${relay.id}`);
    return relay;
  }

  // ------------ on server side ------------

  decouple(muxRelay) {
    muxRelay.on('muxNewConn', (args) => this.onNewConnection(muxRelay, args));
    muxRelay.on('muxDataFrame', (args) => this.onDataFrame(muxRelay, args));
    muxRelay.on('muxCloseConn', (args) => this.onSubConnClose(args));
    muxRelay.on('close', () => this.onMuxRelayClose(muxRelay));
    this._muxRelays.set(muxRelay.id, muxRelay);
  }

  onNewConnection(muxRelay, {cid, host, port, onCreated}) {
    const context = muxRelay.getContext();
    const relay = new Relay({transport: __TRANSPORT__, context: context, presets: []});
    relay.id = cid;
    relay.on('close', () => this._relays.delete(cid));
    relay.onBroadcast({
      type: CONNECT_TO_REMOTE,
      payload: {
        host: host,
        port: port,
        onConnected: onCreated
      }
    });
    this._relays.set(cid, relay);
    logger.verbose(`[mux] create sub relay: ${relay.id}, total: ${this._relays.size}`);
    return relay;
  }

  onDataFrame(muxRelay, {cid, data}) {
    const relay = this._relays.get(cid);
    if (relay) {
      if (!relay.hasListener('encode')) {
        relay.on('encode', muxRelay.onPipeEncoded.bind(muxRelay));
      }
      relay.onPipeDecoded(data);
    } else {
      logger.error(`[mux] fail to route data frame, no such sub relay: cid=${cid}`);
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
