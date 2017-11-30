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
    const muxRelay = this._getMuxRelay(relay.getContext());
    if (!relay.hasListener('encode')) {
      relay.on('encode', muxRelay.onPipeEncoded.bind(muxRelay));
    }
    if (!muxRelay.hasListener('decode')) {
      muxRelay.on('decode', relay.onPipeDecoded.bind(relay));
    }
  }

  // on server side
  decouple(muxRelay) {
    muxRelay.on('frame', ({host, port, cid, onResolved}) => {
      const relay = this._getRelay(muxRelay.getContext(), {host, port, cid}, onResolved);
      if (!relay.hasListener('encode')) {
        relay.on('encode', muxRelay.onPipeEncoded.bind(muxRelay)); // TODO: pick a random mux relay?
      }
      if (!muxRelay.hasListener('decode')) {
        muxRelay.on('decode', relay.onPipeDecoded.bind(relay));
      }
    });
  }

  _getRelay(context, {host, port, cid}, cb) {
    let relay = this._relays.get(cid);
    if (!relay) {
      relay = Relay.create({transport: __TRANSPORT__, context, presets: []});
      relay.id = cid;
      relay.on('close', () => this._relays.delete(cid));
      relay.onBroadcast({
        type: CONNECT_TO_REMOTE,
        payload: {
          host: host,
          port: port,
          onConnected: cb
        }
      });
      this._relays.set(cid, relay);
    } else {
      cb();
    }
    logger.verbose(`[mux] total relay: ${this._relays.size}/${__MUX_CONCURRENCY__}, use: ${relay.id}`);
    return relay;
  }

  _getMuxRelay(context) {
    const relays = this._muxRelays;
    const concurrency = relays.size;
    let relay = null;
    if (concurrency < __MUX_CONCURRENCY__) {
      // create mux relay if necessary
      const cid = uniqueId('mux_');
      relay = Relay.create({transport: __TRANSPORT__, context, presets: [], isMux: true});
      relay.id = cid;
      relay.on('close', () => {
        relays.delete(cid);
        logger.debug(`[mux] relay ${relay.id} is destroyed`);
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
