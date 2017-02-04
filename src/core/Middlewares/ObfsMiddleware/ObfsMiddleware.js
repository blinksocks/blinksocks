import {IMiddleware} from '../Interface';

export class ObfsMiddleware extends IMiddleware {

  write(buffer) {
    return new Promise((next) => {
      next(buffer);
    });
  }

}
