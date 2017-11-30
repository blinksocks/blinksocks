import uniqueId from 'lodash.uniqueid';
import {Relay} from './relay';
import {getRandomInt, logger} from '../utils';
import {CONNECT_TO_REMOTE} from '../presets';

// TODO: remove the following globals
global.__MUX__ = true;
global.__MUX_CONCURRENCY__ = 10;

export class Mux {

  _relays = new Map(/* <cid>: <relay> */);

  _muxRelays = new Map(/* <cid>: <relay> */);

  // on client side
  couple(relay) {
    const muxRelay = this._getOrCreateMuxRelay(relay.getContext());
    relay.on('encode', muxRelay.onPipeEncoded.bind(muxRelay));
    relay.on('close', () => this._relays.delete(relay.id));
    this._relays.set(relay.id, relay);
    logger.debug(`[mux] mix relay ${relay.id} into mux relay ${muxRelay.id}`);
  }

  // on server side
  decouple(muxRelay) {
    muxRelay.on('frame', ({host, port, cid, data}) => {
      let relay;
      if (relay = this._relays.get(cid)) {
        relay.onPipeDecoded(data);
      } else {
        relay = this._createRelay({
          context: muxRelay.getContext(), host, port, cid,
          onCreated() {
            relay.onPipeDecoded(data);
          }
        });
      }
      if (!relay.hasListener('encode')) {
        // const leftRelay = this.getRandomMuxRelay(); TODO: pick a random mux relay?
        const leftRelay = muxRelay;
        relay.on('encode', leftRelay.onPipeEncoded.bind(leftRelay));
      }
    });
    muxRelay.on('close', () => {
      logger.debug(`[mux] mux relay ${muxRelay.id} is destroyed`);
      this._muxRelays.delete(muxRelay.id);
      // TODO: cleanup associate relays?
    });
    this._muxRelays.set(muxRelay.id, muxRelay);
  }

  // server
  _createRelay({context, host, port, cid, onResolved}) {
    const relay = Relay.create({transport: __TRANSPORT__, context, presets: []});
    relay.id = cid;
    relay.on('close', () => this._relays.delete(cid));
    relay.onBroadcast({
      type: CONNECT_TO_REMOTE,
      payload: {
        host: host,
        port: port,
        onConnected: onResolved
      }
    });
    this._relays.set(cid, relay);
    logger.verbose(`[mux] create sub relay ${relay.id}, total: ${this._relays.size}`);
  }

  // client
  _getOrCreateMuxRelay(context) {
    const relays = this._muxRelays;
    const concurrency = relays.size;
    let relay = null;
    if (concurrency < __MUX_CONCURRENCY__) {
      // create mux relay if necessary
      const cid = uniqueId() | 0;
      relay = Relay.create({transport: __TRANSPORT__, context, presets: [], isMux: true});
      relay.id = cid;
      relay.on('close', () => {
        relays.delete(cid);
        logger.debug(`[mux] relay ${relay.id} is destroyed`);
      });
      relay.on('frame', ({cid, data}) => {
        const leftRelay = this._relays.get(cid);
        if (!leftRelay) {
          logger.error(`leftRelay ${cid} is not found`);
          return;
        }
        leftRelay.onPipeDecoded(data);
      });
      relays.set(cid, relay);
    } else {
      // or just randomly pick one
      relay = relays.get([...relays.keys()][getRandomInt(0, concurrency - 1)]);
    }
    logger.debug(`[mux] total relay: ${relays.size}/${__MUX_CONCURRENCY__}, use: ${relay.id}`);
    return relay;
  }

}
