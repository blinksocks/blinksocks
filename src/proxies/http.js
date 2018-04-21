import url from 'url';
import http from 'http';
import { logger, isValidPort } from '../utils';

function checkBasicAuthorization(credentials, { username, password }) {
  if (!credentials) {
    return false;
  }
  const utf8str = Buffer.from(credentials, 'base64').toString();
  const [uname, passwd] = utf8str.split(':');
  if (uname !== username || passwd !== password) {
    return false;
  }
  return true;
}

export function createServer({ username, password }) {
  const server = http.createServer();

  // Simple HTTP Proxy
  server.on('request', (req, res) => {
    const { hostname, port, path: pathname } = url.parse(req.url);
    const { socket, method, httpVersion, headers } = req;
    const appAddress = `${socket.remoteAddress}:${socket.remotePort}`;

    const _port = +port || 80;

    if (hostname === null || !isValidPort(_port)) {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      logger.warn(`[http] drop invalid http request sent from ${remote}`);
      return res.end();
    }

    // Basic Authorization
    const proxyAuth = headers['proxy-authorization'];
    if (proxyAuth && username !== '' && password !== '') {
      const [type, credentials] = proxyAuth.split(' ');
      if (type !== 'Basic' || !checkBasicAuthorization(credentials, { username, password })) {
        logger.error(`[http] [${appAddress}] authorization failed, type=${type} credentials=${credentials}`);
        return res.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
      }
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
        const newHeaders = headerKeys.reduce((result, key) => {
          result.push(`${key}: ${headers[key]}\r\n`);
          return result;
        }, []);
        const reqMsg = `${method} ${pathname} HTTP/${httpVersion}\r\n` + newHeaders.join('') + '\r\n';
        send(Buffer.from(reqMsg));

        // free to recv from application now
        socket.resume();
      }
    });
  });

  // HTTPS tunnel
  server.on('connect', (req, socket) => {
    const { hostname, port } = new URL(`http://${req.url}`);
    const appAddress = `${socket.remoteAddress}:${socket.remotePort}`;

    const _port = +port || 443;

    if (hostname === null || !isValidPort(_port)) {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      logger.warn(`[http] [${appAddress}] drop invalid http CONNECT request sent from ${remote}`);
      return socket.destroy();
    }

    // Basic Authorization
    const proxyAuth = req.headers['proxy-authorization'];
    if (proxyAuth && username !== '' && password !== '') {
      const [type, credentials] = proxyAuth.split(' ');
      if (type !== 'Basic' || !checkBasicAuthorization(credentials, { username, password })) {
        logger.error(`[http] [${appAddress}] authorization failed, type=${type} credentials=${credentials}`);
        return socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      }
    }

    server.emit('proxyConnection', socket, {
      host: hostname,
      port: _port,
      onConnected: () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      }
    });
  });

  // errors
  server.on('clientError', (err, socket) => {
    const appAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    logger.error(`[http] [${appAddress}] invalid http request: ${err.message}`);
    socket.destroy();
  });

  return server;
}
