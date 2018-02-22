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
    var _url$parse = _url2.default.parse(req.url);

    const hostname = _url$parse.hostname,
          port = _url$parse.port,
          path = _url$parse.path;
    const socket = req.socket,
          method = req.method,
          httpVersion = req.httpVersion,
          headers = req.headers;


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
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = headerKeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            const key = _step.value;

            const value = headers[key];
            _headers.push(`${key}: ${value}\r\n`);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        const reqMsg = `${method} ${path} HTTP/${httpVersion}\r\n` + _headers.join('') + '\r\n';
        send(Buffer.from(reqMsg));

        socket.resume();
      }
    });
  });

  server.on('connect', (req, socket) => {
    var _url$parse2 = _url2.default.parse(`http://${req.url}`);

    const hostname = _url$parse2.hostname,
          port = _url$parse2.port;


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
    const remoteAddress = socket.remoteAddress,
          remotePort = socket.remotePort;

    _utils.logger.error(`[http] [${remoteAddress}:${remotePort}] invalid http request: ${err.message}`);
    socket.destroy();
  });

  return server;
}