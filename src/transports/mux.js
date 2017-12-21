import {TcpInbound, TcpOutbound} from './tcp';

export class MuxInbound extends TcpInbound {

  get name() {
    return 'mux:inbound';
  }

}

export class MuxOutbound extends TcpOutbound {

  get name() {
    return 'mux:outbound';
  }

}
