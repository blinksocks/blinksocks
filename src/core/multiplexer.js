import {Relay} from './relay';
import {getRandomInt, logger, generateMutexId} from '../utils';
import {CONNECT_TO_REMOTE} from '../presets/defs';

// TODO: remove the following globals
global.__MUX__ = true;
global.__MUX_CONCURRENCY__ = 1;

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
    relay.on('frame', ({cid, data}) => {
      const leftRelay = this._relays.get(cid);
      if (!leftRelay) {
        logger.error(`[mux] leftRelay ${cid} is not found`);
        return;
      }
      leftRelay.onPipeDecoded(data);
    });
    this._muxRelays.set(cid, relay);
    logger.debug(`[mux] create mux relay ${relay.id}`);
    return relay;
  }

  // ------------ on server side ------------

  decouple(muxRelay) {
    muxRelay.on('frame', (...args) => this.onDataFrame(muxRelay, ...args));
    muxRelay.on('subClose', (cid) => this.onSubConnClose(cid));
    muxRelay.on('close', () => this.onMuxRelayClose(muxRelay));
    this._muxRelays.set(muxRelay.id, muxRelay);
  }

  onDataFrame(muxRelay, {cid, data, host, port}) {
    let relay = this._relays.get(cid);
    if (!relay) {
      relay = this.onNewConnection(muxRelay, {cid, host, port, data});
    }
    if (!relay.hasListener('encode')) {
      // const leftRelay = this.getRandomMuxRelay(); TODO: pick a random mux relay?
      const leftRelay = muxRelay;
      relay.on('encode', leftRelay.onPipeEncoded.bind(leftRelay));
    }
    relay.onPipeDecoded(data);
  }

  onSubConnClose(cid) {
    const relay = this._relays.get(cid);
    if (relay) {
      relay.destroy();
      this._relays.delete(cid);
    } else {
      logger.warn(`[mux] fail to close sub connection, no such relay: ${cid}`);
    }
  }

  onMuxRelayClose(muxRelay) {
    logger.debug(`[mux] mux relay ${muxRelay.id} is destroyed`);
    this._muxRelays.delete(muxRelay.id);
    // TODO: cleanup associate relays?
  }

  onNewConnection(muxRelay, {cid, host, port, data}) {
    const context = muxRelay.getContext();
    const relay = new Relay({transport: __TRANSPORT__, context: context, presets: []});
    relay.id = cid;
    relay.on('close', () => this._relays.delete(cid));
    relay.onBroadcast({
      type: CONNECT_TO_REMOTE,
      payload: {
        host: host,
        port: port,
        onConnected: () => relay.onPipeDecoded(data)
      }
    });
    logger.verbose(`[mux] create sub relay ${relay.id}, total: ${this._relays.size + 1}`);
    this._relays.set(cid, relay);
    return relay;
  }

}
