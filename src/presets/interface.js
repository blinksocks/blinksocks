export class IPreset {

  /**
   * how to deal with the action, return false to ignore
   * @returns {boolean}
   */
  onNotified(/* action */) {
    return false;
  }

  // hooks

  beforeOut({buffer/* , next, broadcast */}) {
    return buffer;
  }

  beforeIn({buffer/* , next, broadcast */}) {
    return buffer;
  }

  // the following interfaces must be implemented

  clientOut(/* {buffer, next, broadcast} */) {

  }

  serverIn(/* {buffer, next, broadcast} */) {

  }

  serverOut(/* {buffer, next, broadcast} */) {

  }

  clientIn(/* {buffer, next, broadcast} */) {

  }

}
