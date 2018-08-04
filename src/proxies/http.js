import { URL } from 'url';
import http from 'http';
import https from 'https';
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

export function createServer({ secure, https_key, https_cert, username, password }) {
  const name = secure ? 'https' : 'http';
  let server = null;
  if (secure) {
    server = https.createServer({ key: https_key, cert: https_cert });
  } else {
    server = http.createServer();
  }

  const isAuthRequired = username !== '' && password !== '';

  // Simple HTTP Proxy
  server.on('request', (req, res) => {
    let parseResult;
    try {
      parseResult = new URL(req.url);
    } catch (err) {
      res.writeHead(400);
      return res.end();
    }
    const { hostname, port, pathname } = parseResult;
    const { socket, method, httpVersion, headers } = req;
    const appAddress = `${socket.remoteAddress}:${socket.remotePort}`;

    const _port = +port || 80;

    if (hostname === null || !isValidPort(_port)) {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      logger.warn(`[${name}] drop invalid http request sent from ${remote}`);
      return res.end();
    }

    // Basic Authorization
    if (isAuthRequired) {
      const proxyAuth = headers['proxy-authorization'] || '';
      const [type, credentials] = proxyAuth.split(' ');
      if (type !== 'Basic' || !checkBasicAuthorization(credentials, { username, password })) {
        logger.error(`[${name}] [${appAddress}] authorization failed, type=${type} credentials=${credentials}`);
        res.writeHead(401);
        return res.end();
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
      },
    });
  });

  // HTTPS tunnel
  server.on('connect', (req, socket) => {
    const [hostname, _port] = req.url.split(':');
    const appAddress = `${socket.remoteAddress}:${socket.remotePort}`;

    const port = parseInt(_port) || 443;

    if (hostname === null || !isValidPort(port)) {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      logger.warn(`[${name}] [${appAddress}] drop invalid http CONNECT request sent from ${remote}`);
      return socket.destroy();
    }

    // Basic Authorization
    if (isAuthRequired) {
      const proxyAuth = req.headers['proxy-authorization'] || '';
      const [type, credentials] = proxyAuth.split(' ');
      if (type !== 'Basic' || !checkBasicAuthorization(credentials, { username, password })) {
        logger.error(`[${name}] [${appAddress}] authorization failed, type=${type} credentials=${credentials}`);
        return socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      }
    }

    server.emit('proxyConnection', socket, {
      host: hostname,
      port: port,
      onConnected: () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      },
    });
  });

  // errors
  server.on('clientError', (err, socket) => {
    const appAddress = `${socket.remoteAddress || ''}:${socket.remotePort || ''}`;
    logger.error(`[${name}] [${appAddress}] invalid http request: ${err.message}`);
    socket.destroy();
  });

  return server;
}
