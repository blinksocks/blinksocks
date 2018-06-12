import dgram from 'dgram';
import http from 'http';
import curl from './curl';
import udp from './udp';
import { HTTP_SERVER_PORT, UDP_SERVER_PORT, MOCK_RESPONSE } from './constants';
import { Hub } from '../../src';

let httpServer = null;
let udpServer = null;

function createHttpServer() {
  httpServer = http.createServer();

  httpServer.on('request', (req, res) => {
    res.end(MOCK_RESPONSE);
  });

  httpServer.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  httpServer.listen(HTTP_SERVER_PORT);
}

function createUdpServer() {
  udpServer = dgram.createSocket('udp4');
  udpServer.on('message', (msg, rinfo) => {
    udpServer.send(MOCK_RESPONSE, rinfo.port, rinfo.address);
  });
  udpServer.bind(UDP_SERVER_PORT);
}

// create http and udp mock servers
beforeAll(() => {
  createHttpServer();
  createUdpServer();
});

// close all mock servers
afterAll(() => {
  httpServer.close();
  udpServer.close();
});

export default async function run({ proxy, auth = {}, clientJson, serverJson, not = false, isUdp = false, repeat = 1 }) {
  const props = {
    username: auth.username,
    password: auth.password,
    proxyHost: '127.0.0.1',
    proxyPort: 1081,
    targetHost: '127.0.0.1',
    targetPort: 8080,
  };
  const client = new Hub(clientJson);
  const server = new Hub(serverJson);
  await Promise.all([
    client.run(),
    server.run(),
  ]);
  while (repeat--) {
    let response;
    if (isUdp) {
      response = await udp(props);
    } else {
      response = await curl({ proxyMethod: proxy, ...props });
    }
    if (not) {
      expect(response).not.toBe(MOCK_RESPONSE);
    } else {
      expect(response).toBe(MOCK_RESPONSE);
    }
  }
  await Promise.all([
    client.terminate(),
    server.terminate(),
  ]);
}
