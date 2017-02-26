export class IPreset {

  // the following interfaces is optional

  onNotified(/* action */) {
    return false;
  }

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
