import uniqueId from 'lodash.uniqueid';
import {Relay} from '../core';
import {TcpInbound, TcpOutbound} from './tcp';
import {TlsInbound, TlsOutbound} from './tls';
import {WsInbound, WsOutbound} from './websocket';

const mapping = {
  'tcp': [TcpInbound, TcpOutbound],
  'tls': [TlsInbound, TlsOutbound],
  'ws': [WsInbound, WsOutbound]
};

export function createRelay(transport, context) {
  const [Inbound, Outbound] = __IS_CLIENT__ ? [TcpInbound, mapping[transport][1]] : [mapping[transport][0], TcpOutbound];
  const props = {context, Inbound, Outbound};
  const relay = new Relay(props);
  relay.id = uniqueId(`${transport}_`);
  return relay;
}
