# blinksocks

[![version](https://img.shields.io/npm/v/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![downloads](https://img.shields.io/npm/dt/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![license](https://img.shields.io/npm/l/blinksocks.svg)](https://github.com/micooz/blinksocks/blob/master/LICENSE)
[![dependencies](https://img.shields.io/david/micooz/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![devDependencies](https://img.shields.io/david/dev/micooz/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)

[![Travis](https://img.shields.io/travis/micooz/blinksocks.svg)](https://travis-ci.org/micooz/blinksocks)
[![Coverage](https://img.shields.io/codecov/c/github/micooz/blinksocks/master.svg)](https://codecov.io/gh/micooz/blinksocks)
[![%e2%9d%a4](https://img.shields.io/badge/made%20with-%e2%9d%a4-ff69b4.svg)](https://github.com/micooz/blinksocks)

Yet another Socks5 proxy, designed for speed :zap:. Inspired by [Shadowsocks](https://shadowsocks.org/en/index.html).

> Across the Great Wall we can reach every corner in the world.

## Features

* Http/Socks5/Socks4/Socks4a compatible
* TCP and UDP relay
* IPv4 and IPv6 support
* Universal server and client
* Fully encryption
* Docker integration

## Installation

You can get pre-compiled library(including executable) of blinksocks from **yarn** or **npm**. Both approach requires your system have had [Node.js](https://nodejs.org) installed.

### -> via yarn

If you know [yarn](https://yarnpkg.com/), this way is recommended:

```
$ yarn global add blinksocks
```

### -> via npm

```
$ npm install -g blinksocks
```

## Usage

Once installed, you can access blinksocks from command line directly:

```
$ blinksocks --help

  Usage: blinksocks [options] [...]

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -c, --config [file]         a json file for configuration, if specified, ignore other options
    --host <host>               an ip address or a hostname to bind
    --port <port>               where to listen on
    --password <password>       a password for encryption and decryption
    --server-host [serverHost]  an ip address or a hostname to connect
    --server-port [serverPort]  where is the server listen on
    --cipher [cipher]           a method for encryption or decryption, leave it empty to enbaled non-encryption mode
    --use-iv                    if use initialization vector for encryption
    --log-level [logLevel]      log4js log level
    -q, --quiet                 limit log level to 'error'
    --ciphers                   show all supported ciphers

  Examples:

  As simple as possible:
    $ blinksocks -c config.json

  To start a server:
    $ blinksocks --host 0.0.0.0 --port 7777 --password password --cipher "aes-256-cfb"

  To start a client:
    $ blinksocks --host localhost --port 1080 --password password --server-host example.com --server-port 7777 --cipher "aes-256-cfb"

```

## Configuration

To start a server or client, you can prepare a configuration json file(`config.json` for example)
via `--config` or `-c` as follows:

### Client

```
{
  "host": "localhost",
  "port": 1080,
  "server_host": "example.com",
  "server_port": 7777,
  "password": "my secret password",
  "cipher": "aes-256-cfb",
  "use_iv": true,
  "log_level": "error"
}
```

### Server

Just without `server_host` and `server_port`:

```
{
  "host": "0.0.0.0",
  "port": 7777,
  "password": "my secret password",
  "cipher": "aes-256-cfb",
  "use_iv": true,
  "log_level": "error"
}
```

Or you can provide all pf them via command line.

* `host(--host)`: Typically **localhost**.
* `port(--port)`: Typically **1080**.
* `server_host(--server-host)`: Typically **0.0.0.0**.
* `server_port(--server-port)`: Any available number.
* `password(--password)`: For data encryption, please keep it secret!
* `cipher(--cipher)`: Encryption method. You can enable **non-encryption mode** by set it to empty string.
* `use_iv(--use-iv)`: Whether encrypt/decrypt with initialization vector or not.
* `log_level(--log-level)`: should take a value from Logging Level of
[Log4js.Level](http://stritti.github.io/log4js/docu/users-guide.html#configuration). The levels are case-insensitive and cumulative.

## Compile for production

For production use, we are running our code under `lib` not `src`, so compilation is necessary.

Compilation of blinksocks is super easy:

```
$ npm run compile
```

This will compile `src` to `lib`.

## Test

Any application who supports socks5 protocol([RFC 1928](https://tools.ietf.org/html/rfc1928)) can be used for testing.

For example:

```
# Socks5
$ curl --socks5-hostname localhost:1080 https://www.google.com

# Http
$ curl -x http://localhost:1080 https://www.google.com
```

## Deploy

We use Docker to auto-deploy a blinksocks **server**.

### Get image

You can build an image manually or pull it from docker hub:

* Build an image

```
$ docker build --tags blinksocks:latest .
```

* Pull from docker hub

```
$ docker pull blinksocks:latest
```

### Run in a container

Container will expose `1080` port, so you must bind a host port to `1080` via `-p`.

```
$ docker run -d -p 7777:1080 blinksocks:latest
```

## For Firefox/Google Chrome and more...

A common usage of blinksocks is used it on **browsers**, so I give an advise here.

For Google Chrome, [SwitchyOmega](https://github.com/FelisCatus/SwitchyOmega) extension is a great approach to use socks5 service.

For FireFox, you can configure proxy at `Settings - Advanced - Network - Proxy`.

## Documentation

If you are interesting in `Principle`, `Architecture` or `Spec` of blinksocks, please
check out: [docs](https://github.com/micooz/blinksocks/tree/master/docs).

## Roadmap

Done:

* [x] non-encryption mode for debugging and non-security scenarios
* [x] streaming data send/receive
* [x] encrypt/decrypt with initialization vector
* [x] DNS cache
* [x] UDP relay(need test!)
* [x] docker deploy scripts
* [x] more command line options

Next minor version:

**v2.1.0**:

* [x] http proxy
* [x] Socks4 proxy
* [ ] Socks4a proxy
* [ ] daemon mode
* [ ] cluster processes

Further versions:

* [ ] ip ban
* [ ] more tests
* [ ] more docs
* [ ] more cipher support
* [ ] ...

## References

RFC:

* [SOCKS4](http://www.openssh.com/txt/socks4.protocol)
* [SOCKS4a](http://www.openssh.com/txt/socks4a.protocol)
* [SOCKS5 RFC-1928](https://tools.ietf.org/rfc/rfc1928.txt)
* [HTTP/1.1 RFC-2616](https://tools.ietf.org/rfc/rfc2616.txt)

## Contributors

Micooz(Owner), micooz@hotmail.com

Waiting for more contributors...

## License

Apache License 2.0