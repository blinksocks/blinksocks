import http from 'http';
import util from 'util';
import child_process from 'child_process';
import { Hub } from '../../src';

let HTTP_PORT = process.env.HTTP_PORT;

if (typeof HTTP_PORT === 'undefined') {
  console.warn('env HTTP_PORT is not provided, fallback to use 8080');
  HTTP_PORT = 8080;
}

const exec = util.promisify(child_process.exec);

let mockServer = null;

beforeAll(() => {
  mockServer = http.createServer();

  mockServer.on('request', (req, res) => {
    res.end('mock server response');
  });

  mockServer.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  mockServer.listen(HTTP_PORT);
});

afterAll(() => {
  mockServer.close();
});

async function curl({ proxy = 'socks5' }) {
  const client = '127.0.0.1:1081';
  const target = 'http://localhost:' + HTTP_PORT;
  const options = {
    encoding: 'utf-8',
    timeout: 5e3,
  };
  const proxyMethod = {
    'http': '-x',
    'socks': '--socks5',
    'socks4': '--socks4',
    'socks4a': '--socks4a',
    'socks5': '--socks5-hostname',
  }[proxy];

  if (typeof proxyMethod === 'undefined') {
    throw Error(`unsupported proxy method: ${proxy}`);
  }

  try {
    const { stdout } = await exec(`curl -L ${proxyMethod} ${client} ${target}`, options);
    return stdout;
  } catch (err) {
    console.log(err);
    return '';
  }
}

export default async function run({ proxy, clientJson, serverJson, repeat = 1 }) {
  const client = new Hub(clientJson);
  const server = new Hub(serverJson);
  await client.run();
  await server.run();
  while (repeat--) {
    expect(await curl({ proxy })).toBe('mock server response');
  }
  await client.terminate();
  await server.terminate();
}
