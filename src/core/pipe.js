import EventEmitter from 'events';
import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD
} from './middleware';
import {PROCESSING_FAILED} from '../presets/defs';

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
    const middlewares = this.getMiddlewares(direction);
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

  getMiddlewares(direction) {
    return {
      [MIDDLEWARE_DIRECTION_UPWARD]: this._upstream_middlewares,
      [MIDDLEWARE_DIRECTION_DOWNWARD]: this._downstream_middlewares
    }[direction];
  }

  feed(direction, buffer) {
    const eventName = `next_${direction}`;
    const middlewares = this.getMiddlewares(direction);

    // methods to be injected
    const direct = (buf, isReverse = false) => {
      this.emit(isReverse ? `next_${-direction}` : eventName, buf);
    };
    const fail = (name, message) => this.onBroadcast(direction, {
      type: PROCESSING_FAILED,
      payload: {
        name,
        message,
        orgData: buffer
      }
    });

    // create event chain among middlewares
    const last = middlewares.reduce((prev, next) => {
      if (prev.listenerCount(eventName) < 1) {
        prev.on(eventName, (buf) => next.write(direction, {buffer: buf, direct, fail}));
      }
      return next;
    });

    // the last middleware send data out via direct(buf)
    if (last.listenerCount(eventName) < 1) {
      last.on(eventName, direct);
    }

    // begin pipe
    middlewares[0].write(direction, {buffer, direct, fail});
  }

}
