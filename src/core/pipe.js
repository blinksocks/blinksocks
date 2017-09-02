import EventEmitter from 'events';
import {MIDDLEWARE_DIRECTION_UPWARD} from './middleware';
import {PRESET_INIT, PRESET_FAILED} from '../presets/defs';

export class Pipe extends EventEmitter {

  _upstream_middlewares = [];

  _downstream_middlewares = [];

  _cacheBuffer = null; // buffer

  constructor() {
    super();
    this.broadcast = this.broadcast.bind(this);
  }

  broadcast(action) {
    const middlewares = this.getMiddlewares();
    const results = [];
    for (const middleware of middlewares) {
      results.push(middleware.notify(action));
    }
    // if no middleware handled this action, bubble up to where pipe created.
    if (results.every((result) => !!result === false)) {
      this.emit('broadcast', action);
    }
  }

  /**
   * setup two-way middlewares
   * @param middlewares
   */
  setMiddlewares(middlewares) {
    // set listeners
    for (const middleware of middlewares) {
      middleware.setMaxListeners(4);
      middleware.on('broadcast', this.broadcast);
      middleware.on('fail', (name, message) => void this.broadcast({
        type: PRESET_FAILED,
        payload: {
          name,
          message,
          orgData: this._cacheBuffer
        }
      }));
    }
    this._upstream_middlewares = middlewares;
    this._downstream_middlewares = [].concat(middlewares).reverse();
    // initial broadcast
    this.broadcast({type: PRESET_INIT, payload: {broadcast: this.broadcast}});
  }

  getMiddlewares(direction = MIDDLEWARE_DIRECTION_UPWARD) {
    if (direction === MIDDLEWARE_DIRECTION_UPWARD) {
      return this._upstream_middlewares;
    } else {
      return this._downstream_middlewares;
    }
  }

  feed(direction, buffer) {
    const eventName = `next_${direction}`;
    const middlewares = this.getMiddlewares(direction);

    // methods to be injected
    const direct = (buf, isReverse = false) => this.emit(isReverse ? `next_${-direction}` : eventName, buf);

    // create event chain among middlewares
    const last = middlewares.reduce((prev, next) => {
      if (!prev.hasListener(eventName)) {
        prev.on(eventName, (buf) => next.write(direction, {buffer: buf, direct}));
      }
      return next;
    });

    // the last middleware send data out via direct(buf, false)
    if (!last.hasListener(eventName)) {
      last.on(eventName, direct);
    }

    // begin pipe
    middlewares[0].write(direction, {buffer, direct});

    // TODO(fix): here only cached the first incoming data for carrying "orgData" in PRESET_FAILED.
    // NOTE: cache full data may be a bad practice.
    if (this._cacheBuffer === null) {
      this._cacheBuffer = buffer;
    }
  }

  destroy() {
    const middlewares = this.getMiddlewares();
    for (const middleware of middlewares) {
      middleware.onDestroy();
    }
    this._upstream_middlewares = null;
    this._downstream_middlewares = null;
    this._staging = null;
    this.removeAllListeners();
  }

}
