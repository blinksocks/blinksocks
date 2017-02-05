import {IObfs} from './interface';

export default class HttpObfs extends IObfs {

  forwardToServer(buffer) {
    return buffer;
  }

  forwardToDst(buffer) {
    return buffer;
  }

  backwardToClient(buffer) {
    return buffer;
  }

  backwardToApplication(buffer) {
    return buffer;
  }

}
