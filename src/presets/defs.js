export const SOCKET_CONNECT_TO_DST = 'socket/connect/to/dst';
export const PROXY_HANDSHAKE_DONE = 'socket/handshake/done';
export const PROCESSING_FAILED = 'processing/failed';

export class IPreset {

  /**
   * how to deal with the action, return false/undefined to ignore/continue broadcast
   * @returns {boolean}
   */
  onNotified(/* action */) {
    return false;
  }

  // hooks

  beforeOut({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  beforeIn({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  // the following interfaces must be implemented

  clientOut({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  serverIn({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  serverOut({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  clientIn({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

}
