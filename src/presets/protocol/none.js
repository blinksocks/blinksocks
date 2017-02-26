import {IPreset} from '../interface';

export default class NoneProtocol extends IPreset {

  clientOut({buffer}) {
    return buffer;
  }

  serverIn({buffer}) {
    return buffer;
  }

  serverOut({buffer}) {
    return buffer;
  }

  clientIn({buffer}) {
    return buffer;
  }

}
