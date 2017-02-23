import {IPreset} from '../interface';

export default class NoneCrypto extends IPreset {

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
