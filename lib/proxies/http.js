'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createServer = createServer;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createServer() {
  const server = _http2.default.createServer();

  server.on('request', (req, res) => {
    const { hostname, port, path } = _url2.default.parse(req.url);
    const { socket, method, httpVersion, headers } = req;

    const _port = +port || 80;

    if (hostname === null || _port === null) {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      _utils.logger.warn(`[http] drop invalid http request sent from ${remote}`);
      return res.end();
    }

    socket.pause();

    server.emit('proxyConnection', socket, {
      host: hostname,
      port: _port,
      onConnected: send => {
        delete headers['proxy-connection'];
        headers['connection'] = 'close';

        const headerKeys = Object.keys(headers);
        const _headers = [];
        for (const key of headerKeys) {
          const value = headers[key];
          _headers.push(`${key}: ${value}\r\n`);
        }
        const reqMsg = `${method} ${path} HTTP/${httpVersion}\r\n` + _headers.join('') + '\r\n';
        send(Buffer.from(reqMsg));

        socket.resume();
      }
    });
  });

  server.on('connect', (req, socket) => {
    const { hostname, port } = _url2.default.parse(`http://${req.url}`);

    const _port = +port || 443;

    if (hostname === null || _port === null) {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      _utils.logger.warn(`[http] drop invalid http CONNECT request sent from ${remote}`);
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

  server.on('clientError', (err, socket) => {
    const { remoteAddress, remotePort } = socket;
    _utils.logger.error(`[http] [${remoteAddress}:${remotePort}] invalid http request: ${err.message}`);
    socket.destroy();
  });

  return server;
}