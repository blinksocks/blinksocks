import uniqueId from 'lodash.uniqueid';
import {Relay} from '../core';
import {TcpInbound, TcpOutbound} from './tcp';
import {TlsInbound, TlsOutbound} from './tls';
import {WsInbound, WsOutbound} from './websocket';

export function createRelay(transport, context) {
  let relay = null;
  switch (transport) {
    case 'tcp':
      relay = new Relay({context, Inbound: TcpInbound, Outbound: TcpOutbound});
      relay.id = uniqueId('tcp_');
      break;
    case 'tls':
      relay = new Relay({context, Inbound: TlsInbound, Outbound: TlsOutbound});
      relay.id = uniqueId('tls_');
      break;
    case 'websocket':
      relay = __IS_CLIENT__
        ? new Relay({context, Inbound: TcpInbound, Outbound: WsOutbound})
        : new Relay({context, Inbound: WsInbound, Outbound: TcpOutbound});
      relay.id = uniqueId('ws_');
      break;
    default:
      throw Error(`unknown transport: ${transport}`);
  }
  return relay;
}
