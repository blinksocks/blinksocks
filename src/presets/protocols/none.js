import {IProtocol} from './interface';

// +----------------+
// |    PAYLOAD     |
// +----------------+
// |    Variable    |
// +----------------+

export default class NoneProtocol extends IProtocol {

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
