import EventEmitter from 'events';

export const MIDDLEWARE_DIRECTION_UPWARD = 0;
export const MIDDLEWARE_DIRECTION_DOWNWARD = 1;

/**
 * check if a middleware implement is valid or not
 * @param name
 * @param impl
 * @returns {boolean}
 */
export function checkMiddleware(name, impl) {
  const requiredMethods = [
    'clientOut',
    'serverIn',
    'serverOut',
    'clientIn'
  ];
  if (requiredMethods.some((method) => typeof impl[method] !== 'function')) {
    throw Error(`all methods [${requiredMethods.toString()}] in ${name} must be implemented`);
  }
  return true;
}

export class IMiddleware extends EventEmitter {

  next = (direction, buffer) => this.emit(`next_${direction}`, buffer);

  subscribe(receiver) {
    this.broadcast = receiver;
  }

  onNotified(/* action */) {
    return false;
  }

  write() {

  }

}
