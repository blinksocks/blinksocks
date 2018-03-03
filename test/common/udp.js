import dgram from 'dgram';
import { SocksClient } from 'socks';

export default async function udp({ proxyHost, proxyPort, targetHost, targetPort }) {
  return new Promise((resolve, reject) => {
    const client = new SocksClient({
      timeout: 1000,
      proxy: {
        ipaddress: proxyHost,
        port: proxyPort,
        type: 5,
      },
      command: 'associate',
      destination: {
        host: targetHost,
        port: targetPort,
      },
    });

    const udpSocket = dgram.createSocket('udp4');

    udpSocket.on('message', (message) => {
      const { data } = SocksClient.parseUDPFrame(message);
      resolve(data.toString());
      client.onClose();
      udpSocket.close();
    });

    client.on('established', (info) => {
      const packet = SocksClient.createUDPFrame({
        remoteHost: { host: targetHost, port: targetPort },
        data: Buffer.alloc(0),
      });
      udpSocket.send(packet, info.remoteHost.port, info.remoteHost.host);
    });

    client.on('error', reject);

    client.connect();
  });
}
