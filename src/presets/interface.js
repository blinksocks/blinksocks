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

  clientOut({buffer/* , next, broadcast, fail */}) {
    return buffer;
  }

  serverIn({buffer/* , next, broadcast, fail */}) {
    return buffer;
  }

  serverOut({buffer/* , next, broadcast, fail */}) {
    return buffer;
  }

  clientIn({buffer/* , next, broadcast, fail */}) {
    return buffer;
  }

}
