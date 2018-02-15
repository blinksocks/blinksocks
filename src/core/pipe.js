import EventEmitter from 'events';
import {Middleware} from './middleware';
import {PIPE_ENCODE} from '../constants';
import {PRESET_FAILED} from '../presets/defs';
import {logger} from '../utils';

// .on('broadcast')
// .on(`pre_${direction}`)
// .on(`post_${direction}`)
export class Pipe extends EventEmitter {

  _upstream_middlewares = [];

  _downstream_middlewares = [];

  _isPipingUdp = false;

  _cacheBuffer = null;

  _destroyed = false;

  _presets = null;

  _config = null;

  get destroyed() {
    return this._destroyed;
  }

  get presets() {
    return this._presets;
  }

  constructor({presets, isUdp = false}, config) {
    super();
    this._config = config;
    this.broadcast = this.broadcast.bind(this);
    this.onReadProperty = this.onReadProperty.bind(this);
    this.createMiddlewares(presets);
    this._isPipingUdp = isUdp;
  }

  broadcast(name, action) {
    const middlewares = this.getMiddlewares();
    const results = [];
    for (const middleware of middlewares) {
      if (middleware.name !== name) {
        results.push(middleware.notify(action));
      }
    }
    // if no middleware handled this action, bubble up to where pipe created.
    if (name !== 'pipe' && results.every((result) => !!result === false)) {
      this.emit('broadcast', action);
    }
  }

  onReadProperty(name, presetName, propertyName) {
    const middlewares = this.getMiddlewares();
    const ms = middlewares.find((m) => m.name === presetName);
    if (ms) {
      const impl = ms.getImplement();
      const value = impl[propertyName];
      return value !== undefined ? value : impl.constructor[propertyName];
    } else {
      logger.warn(`[preset] "${name}" cannot read property from nonexistent preset "${presetName}".`);
    }
  }

  createMiddlewares(presets) {
    const middlewares = presets.map((preset, i) => this._createMiddleware(preset, i));
    this._upstream_middlewares = middlewares;
    this._downstream_middlewares = [].concat(middlewares).reverse();
    this._presets = presets;
  }

  getMiddlewares(direction = PIPE_ENCODE) {
    if (direction === PIPE_ENCODE) {
      return this._upstream_middlewares || [];
    } else {
      return this._downstream_middlewares || [];
    }
  }

  updateMiddlewares(presets) {
    // create index of previous middlewares for fast locate
    const mdIndex = {};
    for (const md of this.getMiddlewares()) {
      mdIndex[md.name] = md;
    }
    // create non-exist middleware and reuse exist one
    const middlewares = [];
    for (let i = 0; i < presets.length; i++) {
      const preset = presets[i];
      let md = mdIndex[preset.name];
      if (md) {
        // remove all listeners for later re-chain later in _feed()
        md.removeAllListeners();
        // keep common listeners
        this._attachEvents(md);
        delete mdIndex[preset.name];
      } else {
        md = this._createMiddleware(preset, i);
      }
      middlewares.push(md);
    }
    // destroy redundant middlewares
    Object.keys(mdIndex).forEach((key) => mdIndex[key].onDestroy());
    // update members
    this._upstream_middlewares = middlewares;
    this._downstream_middlewares = [].concat(middlewares).reverse();
    this._presets = presets;
  }

  feed(direction, buffer, extraArgs) {
    try {
      // cache the current buffer for PRESET_FAILED action
      this._cacheBuffer = buffer;
      // pre-feed hook
      const preEventName = `pre_${direction}`;
      if (this.listenerCount(preEventName) > 0) {
        this.emit(preEventName, buffer, (buf) => this._feed(direction, buf, extraArgs));
      } else {
        this._feed(direction, buffer, extraArgs);
      }
    } catch (err) {
      logger.error('[pipe] error occurred while piping:', err);
    }
  }

  destroy() {
    if (this._destroyed) {
      return;
    }
    const middlewares = this.getMiddlewares();
    for (const middleware of middlewares) {
      middleware.onDestroy();
    }
    this._upstream_middlewares = null;
    this._downstream_middlewares = null;
    this._presets = null;
    this._cacheBuffer = null;
    this._destroyed = true;
    this.removeAllListeners();
  }

  _createMiddleware(preset, index) {
    const middleware = new Middleware({config: this._config, preset});
    this._attachEvents(middleware);
    // set readProperty() and getStore()
    const impl = middleware.getImplement();
    impl.readProperty = (...args) => this.onReadProperty(middleware.name, ...args);
    impl.getStore = () => this._config.stores[index];
    return middleware;
  }

  _attachEvents(middleware) {
    middleware.setMaxListeners(4);
    middleware.on('broadcast', this.broadcast);
    middleware.on('fail', (name, message) => void this.broadcast(name, {
      type: PRESET_FAILED,
      payload: {
        name,
        message,
        orgData: this._cacheBuffer
      }
    }));
  }

  _feed(direction, buffer, extraArgs) {
    const middlewares = this.getMiddlewares(direction);
    // args to be injected
    const isUdp = this._isPipingUdp;
    const direct = (buf, isReverse = false) => this.emit(isReverse ? `post_${-direction}` : `post_${direction}`, buf);
    // create event chain among middlewares
    const event = `next_${direction}`;
    const first = middlewares[0];
    if (!first.hasListener(event)) {
      const last = middlewares.reduce((prev, next) => {
        prev.on(event, (buf) => next.write({direction, buffer: buf, direct, isUdp}, extraArgs));
        return next;
      });
      // the last middleware send data out via direct(buf, false)
      last.on(event, direct);
    }
    // begin pipe
    first.write({direction, buffer, direct, isUdp}, extraArgs);
  }

}
