import url from 'url';
import http from 'http';
import {logger} from '../utils';

export function createServer() {
  const server = http.createServer();

  // Simple HTTP Proxy
  server.on('request', (req, res) => {
    const {hostname, port, path} = url.parse(req.url);
    const {socket, method, httpVersion, headers} = req;

    const _port = +port || 80;

    if (hostname === null || _port === null) {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      logger.warn(`[http] drop invalid http request sent from ${remote}`);
      return res.end();
    }

    // prevent recv before we connected to the server
    socket.pause();

    server.emit('proxyConnection', socket, {
      host: hostname,
      port: _port,
      onConnected: (send) => {
        // keep-alive mechanism seems problematic in our proxy
        delete headers['proxy-connection'];
        headers['connection'] = 'close';

        // rebuild headers
        const headerKeys = Object.keys(headers);
        const _headers = [];
        for (const key of headerKeys) {
          const value = headers[key];
          _headers.push(`${key}: ${value}\r\n`);
        }
        const reqMsg = `${method} ${path} HTTP/${httpVersion}\r\n` + _headers.join('') + '\r\n';
        send(Buffer.from(reqMsg));

        // free to recv from application now
        socket.resume();
      }
    });
  });

  // HTTPS tunnel
  server.on('connect', (req, socket) => {
    const {hostname, port} = url.parse(`http://${req.url}`);

    const _port = +port || 443;

    if (hostname === null || _port === null) {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      logger.warn(`[http] drop invalid http CONNECT request sent from ${remote}`);
      return socket.destroy();
    }

    server.emit('proxyConnection', socket, {
      host: hostname,
      port: _port,
      onConnected: () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      }
    });
  });

  return server;
}
