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
    'forwardToServer',
    'forwardToDst',
    'backwardToClient',
    'backwardToApplication'
  ];
  if (requiredMethods.some((method) => typeof impl[method] !== 'function')) {
    throw Error(`all methods [${requiredMethods.toString()}] in ${name} must be implemented`);
  }
  return true;
}

export class IMiddleware {

  onUpdate(/* action */) {
    return false;
  }

  subscribe(/* notifier */) {

  }

  write() {

  }

}
