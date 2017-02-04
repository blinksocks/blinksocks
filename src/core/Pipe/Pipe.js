export class Pipe {

  _props = null;

  _middlewares = [];

  constructor(props) {
    this._props = props;
    this.onNotify = this.onNotify.bind(this);
  }

  onNotify(action) {
    const results = [];
    for (const middleware of this._middlewares) {
      results.push(middleware.onUpdate(action));
    }
    // if no middleware handled this action, bubble up to where pipe created.
    if (results.every((result) => !!result === false)) {
      this._props.onNotify(action);
    }
  }

  pipe(middleware) {
    middleware.subscribe(this.onNotify);
    this._middlewares.push(middleware);
    return this;
  }

  feed(buffer) {
    return this._middlewares.reduce(
      (prev, next) => prev.then((buf) => next.write(buf)),
      Promise.resolve(buffer)
    );
  }

}
