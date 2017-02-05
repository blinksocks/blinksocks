import {IObfs} from './interface';

export default class NoneObfs extends IObfs {

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
