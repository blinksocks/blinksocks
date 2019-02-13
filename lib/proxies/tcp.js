"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createServer = createServer;

var _net = _interopRequireDefault(require("net"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createServer({
  forwardHost,
  forwardPort
}) {
  const server = _net.default.createServer();

  server.on('connection', socket => {
    socket.pause();
    server.emit('proxyConnection', socket, {
      host: forwardHost,
      port: forwardPort,
      onConnected: () => {
        socket.resume();
      }
    });
  });
  return server;
}