import {IProtocolMiddleware} from './interface';

// +----------------+
// |    PAYLOAD     |
// +----------------+
// |    Variable    |
// +----------------+

export default class NoneProtocolMiddleware extends IProtocolMiddleware {

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
