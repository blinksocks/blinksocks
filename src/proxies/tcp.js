import net from 'net';

export function createServer() {
  const server = net.createServer();

  server.on('connection', (socket) => {
    socket.pause();
    server.emit('proxyConnection', socket, {
      host: __DSTADDR__.host,
      port: __DSTADDR__.port,
      onConnected: () => {
        socket.resume();
      }
    });
  });

  return server;
}
