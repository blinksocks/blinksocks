"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createServer = createServer;

var _url = require("url");

var _http = _interopRequireDefault(require("http"));

var _https = _interopRequireDefault(require("https"));

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function checkBasicAuthorization(credentials, {
  username,
  password
}) {
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

function createServer({
  secure,
  https_key,
  https_cert,
  username,
  password
}) {
  const name = secure ? 'https' : 'http';
  let server = null;

  if (secure) {
    server = _https.default.createServer({
      key: https_key,
      cert: https_cert
    });
  } else {
    server = _http.default.createServer();
  }

  const isAuthRequired = username !== '' && password !== '';
  server.on('request', (req, res) => {
    let parseResult;

    try {
      parseResult = new _url.URL(req.url);
    } catch (err) {
      res.writeHead(400);
      return res.end();
    }

    const {
      hostname,
      port,
      pathname
    } = parseResult;
    const {
      socket,
      method,
      httpVersion,
      headers
    } = req;
    const appAddress = `${socket.remoteAddress}:${socket.remotePort}`;

    const _port = +port || 80;

    if (hostname === null || !(0, _utils.isValidPort)(_port)) {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;

      _utils.logger.warn(`[${name}] drop invalid http request sent from ${remote}`);

      return res.end();
    }

    if (isAuthRequired) {
      const proxyAuth = headers['proxy-authorization'] || '';
      const [type, credentials] = proxyAuth.split(' ');

      if (type !== 'Basic' || !checkBasicAuthorization(credentials, {
        username,
        password
      })) {
        _utils.logger.error(`[${name}] [${appAddress}] authorization failed, type=${type} credentials=${credentials}`);

        res.writeHead(401);
        return res.end();
      }
    }

    socket.pause();
    server.emit('proxyConnection', socket, {
      host: hostname,
      port: _port,
      onConnected: send => {
        delete headers['proxy-connection'];
        headers['connection'] = 'close';
        const headerKeys = Object.keys(headers);
        const newHeaders = headerKeys.reduce((result, key) => {
          result.push(`${key}: ${headers[key]}\r\n`);
          return result;
        }, []);
        const reqMsg = `${method} ${pathname} HTTP/${httpVersion}\r\n` + newHeaders.join('') + '\r\n';
        send(Buffer.from(reqMsg));
        socket.resume();
      }
    });
  });
  server.on('connect', (req, socket) => {
    const [hostname, _port] = req.url.split(':');
    const appAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    const port = parseInt(_port) || 443;

    if (hostname === null || !(0, _utils.isValidPort)(port)) {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;

      _utils.logger.warn(`[${name}] [${appAddress}] drop invalid http CONNECT request sent from ${remote}`);

      return socket.destroy();
    }

    if (isAuthRequired) {
      const proxyAuth = req.headers['proxy-authorization'] || '';
      const [type, credentials] = proxyAuth.split(' ');

      if (type !== 'Basic' || !checkBasicAuthorization(credentials, {
        username,
        password
      })) {
        _utils.logger.error(`[${name}] [${appAddress}] authorization failed, type=${type} credentials=${credentials}`);

        return socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      }
    }

    server.emit('proxyConnection', socket, {
      host: hostname,
      port: port,
      onConnected: () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      }
    });
  });
  server.on('clientError', (err, socket) => {
    const appAddress = `${socket.remoteAddress || ''}:${socket.remotePort || ''}`;

    _utils.logger.error(`[${name}] [${appAddress}] invalid http request: ${err.message}`);

    socket.destroy();
  });
  return server;
}