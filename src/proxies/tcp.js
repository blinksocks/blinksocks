import net from 'net';

export function createServer({ forwardHost, forwardPort }) {
  const server = net.createServer();

  server.on('connection', (socket) => {
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
