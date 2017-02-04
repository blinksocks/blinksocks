export const MIDDLEWARE_DIRECTION_UPWARD = 0;
export const MIDDLEWARE_DIRECTION_DOWNWARD = 1;

export class IMiddleware {

  onUpdate(/* action */) {
    return false;
  }

  subscribe(/* notifier */) {

  }

  write() {

  }

}
