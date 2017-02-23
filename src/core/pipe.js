import EventEmitter from 'events';
import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD
} from '../middlewares';

/**
 * split buffer into chunks
 * @param buffer
 * @param threshold
 * @returns {Array}
 */
export function getChunks(buffer, threshold) {
  const buffers = [];
  let _buffer = buffer;
  let len = _buffer.length;
  do {
    buffers.push(_buffer.slice(0, threshold));
    len -= threshold;
  } while (len > threshold && (_buffer = _buffer.slice(threshold)));
  if (len > 0) {
    buffers.push(_buffer.slice(0, len));
  }
  return buffers;
}

export class Pipe extends EventEmitter {

  _upstream_middlewares = [];

  _downstream_middlewares = [];

  _onNotified = () => 0;

  constructor(props = {}) {
    super();
    this._onNotified = typeof props.onNotified === 'undefined' ? () => 0 : props.onNotified;
    this.onBroadcast = this.onBroadcast.bind(this);
  }

  onBroadcast(direction, action) {
    const middlewares = this._getMiddlewares(direction);
    const results = [];
    for (const middleware of middlewares) {
      results.push(middleware.onNotified(action));
    }
    // if no middleware handled this action, bubble up to where pipe created.
    if (results.every((result) => !!result === false)) {
      this._onNotified(action);
    }
  }

  setMiddlewares(direction, middlewares) {
    for (const middleware of middlewares) {
      middleware.setMaxListeners(2);
      middleware.subscribe((action) => this.onBroadcast(direction, action));
    }
    if (direction === MIDDLEWARE_DIRECTION_UPWARD) {
      this._upstream_middlewares = middlewares;
      this._downstream_middlewares = [].concat(middlewares).reverse();
    } else {
      this._downstream_middlewares = middlewares;
      this._upstream_middlewares = [].concat(middlewares).reverse();
    }
  }

  feed(direction, buffer) {
    const eventName = `next_${direction}`;
    const chunks = getChunks(buffer, 9999999); // TODO: split buffer into smaller chunks
    const middlewares = this._getMiddlewares(direction);

    // create event chain among middlewares
    const last = middlewares.reduce((prev, next) => {
      if (prev.listenerCount(eventName) < 1) {
        prev.on(eventName, (buf) => next.write(direction, buf));
      }
      return next;
    });
    if (last.listenerCount(eventName) < 1) {
      last.on(eventName, (buf) => this.emit(eventName, buf));
    }

    // begin pipe
    for (const chunk of chunks) {
      middlewares[0].write(direction, chunk);
    }
  }

  _getMiddlewares(direction) {
    return {
      [MIDDLEWARE_DIRECTION_UPWARD]: this._upstream_middlewares,
      [MIDDLEWARE_DIRECTION_DOWNWARD]: this._downstream_middlewares
    }[direction];
  }

}
