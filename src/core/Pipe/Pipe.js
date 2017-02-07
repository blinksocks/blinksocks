import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD
} from '../Middlewares';

export class Pipe {

  _upstream_middlewares = [];

  _downstream_middlewares = [];

  _onNotified = () => 0;

  constructor(props = {}) {
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
      middleware.subscribe(direction, this.onBroadcast);
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
    const middlewares = this._getMiddlewares(direction);
    return middlewares.reduce(
      (prev, next) => prev.then((buf) => next.write(direction, buf)),
      Promise.resolve(buffer)
    );
  }

  _getMiddlewares(direction) {
    return {
      [MIDDLEWARE_DIRECTION_UPWARD]: this._upstream_middlewares,
      [MIDDLEWARE_DIRECTION_DOWNWARD]: this._downstream_middlewares
    }[direction];
  }

}
