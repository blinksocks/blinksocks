export class IPreset {

  /**
   * how to deal with the action, return false to ignore
   * @returns {boolean}
   */
  onNotified(/* action */) {
    return false;
  }

  // hooks

  beforeOut({buffer/* , next, broadcast, fail */}) {
    return buffer;
  }

  beforeIn({buffer/* , next, broadcast, fail */}) {
    return buffer;
  }

  // the following interfaces must be implemented

  clientOut(/* {buffer, next, broadcast, fail} */) {

  }

  serverIn(/* {buffer, next, broadcast, fail} */) {

  }

  serverOut(/* {buffer, next, broadcast, fail} */) {

  }

  clientIn(/* {buffer, next, broadcast, fail} */) {

  }

}
