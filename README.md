# blinksocks

[![version](https://img.shields.io/npm/v/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![downloads](https://img.shields.io/npm/dt/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![license](https://img.shields.io/npm/l/blinksocks.svg)](https://github.com/blinksocks/blinksocks/blob/master/LICENSE)
[![dependencies](https://img.shields.io/david/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![devDependencies](https://img.shields.io/david/dev/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)

[![Travis](https://img.shields.io/travis/blinksocks/blinksocks.svg)](https://travis-ci.org/blinksocks/blinksocks)
[![Coverage](https://img.shields.io/codecov/c/github/blinksocks/blinksocks/master.svg)](https://codecov.io/gh/blinksocks/blinksocks)
[![%e2%9d%a4](https://img.shields.io/badge/made%20with-%e2%9d%a4-ff69b4.svg)](https://github.com/blinksocks/blinksocks)

[![blinksocks/blinksocks](http://dockeri.co/image/blinksocks/blinksocks)](https://hub.docker.com/r/blinksocks/blinksocks/)

Yet another Socks5 proxy, designed for speed :zap:. Inspired by [Shadowsocks](https://shadowsocks.org/en/index.html),
And [ShadowsocksR](https://github.com/shadowsocksr/shadowsocksr/tree/manyuser).

> Across the Great Wall we can reach every corner in the world.

## Documentation

* [Motivation](docs/motivation)
* [Principle](docs/principle)
* [Architecture](docs/architecture)
* [Middleware](docs/middleware)
* [Spec](docs/spec)

## Features

* HTTP/Socks5/Socks4/Socks4a compatible
* TCP and UDP relay
* Middleware Based
* Highly flexible and customizable
* Cross-platform
* Docker deployment

## Installation

You can download pre-compiled library(including executable) of blinksocks from **yarn** or **npm**.
Both approach requires your system have had [Node.js](https://nodejs.org) installed.

```
$ npm install -g blinksocks
```

## Upgrade

```
$ npm update -g blinksocks
```

## Usage

Once installed, you can access blinksocks via CLI:

```
$ blinksocks --help

  Usage: blinksocks --host <host> --port <port> --key <key> [...]

  Options:

    -h, --help                           output usage information
    -V, --version                        output the version number
    -c, --config [file]                  a json format file for configuration, if specified, other options are ignored
    --host <host>                        an ip address or a hostname to bind
    --port <port>                        where to listen on
    --server-host [server-host]          an ip address or hostname to connect to
    --server-port [server-port]          which port the server listen on
    --key <key>                          a key for encryption and decryption
    --frame [frame]                      a preset used in frame middleware, default: 'origin'
    --frame-params [crypto-params]       parameters for frame preset, default: ''
    --crypto [crypto]                    a preset used in crypto middleware, default: 'openssl'
    --crypto-params [crypto-params]      parameters for crypto, default: 'aes-256-cfb'
    --protocol [protocol]                a preset used in protocol middleware, default: 'aead'
    --protocol-params [protocol-params]  parameters for protocol, default: 'aes-256-cbc,sha256'
    --obfs [obfs]                        a preset used in obfs middleware, default: 'none'
    --obfs-params [obfs-params]          parameters for obfs, default: ''
    --log-level [log-level]              log level, default: all
    -q, --quiet                          force log level to 'error'
    --ciphers                            display all supported ciphers
    --hashes                             display all supported hash functions


  Examples:

  As simple as possible:
    $ blinksocks -c config.json

  To start a server:
    $ blinksocks --host 0.0.0.0 --port 7777 --key key --crypto openssl --crypto-params aes-256-cfb

  To start a client:
    $ blinksocks --host localhost --port 1080 --server-host example.com --server-port 7777 --key key --crypto openssl --crypto-params aes-256-cfb

```

## Config.json

To start a server or client, you can prepare a configuration json file(`config.json` for example) then supply to `--config` or `-c`.

```
{
  "host": "localhost",
  "port": 6666,
  "server_host": "localhost",
  "server_port": 7777,
  "key": "secret",
  "frame": "origin",
  "frame_params": "",
  "crypto": "openssl",
  "crypto_params": "aes-128-ofb",
  "protocol": "aead",
  "protocol_params": "aes-256-cbc,sha256",
  "obfs": "http",
  "obfs_params": "http-fake.txt",
  "log_level": "error"
}
```

|      FIELD      |               DESCRIPTION                 |        DEFAULT       |
|:----------------|:------------------------------------------|:---------------------|
| host            | local ip address or domain name           | "localhost"          |
| port            | local port to bind                        | 1080                 |
| server_host     | server ip or domain name, **client only** | -                    |
| server_port     | server port, **client only**              | -                    |
| key             | for encryption and decryption             | -                    |
| frame           | frame preset                              | "origin"             |
| frame_params    | parameters for frame preset               | ""                   |
| crypto          | crypto preset                             | "openssl"            |
| crypto_params   | parameters for crypto preset              | "aes-256-cfb"        |
| protocol        | protocol preset                           | "aead"               |
| protocol_params | parameters for protocol preset            | "aes-256-cbc,sha256" |
| obfs            | obfs preset                               | "none"               |
| obfs_params     | parameters for obfs preset                | ""                   |
| log_level       | log level                                 | "error"              |

## Compile for production

For production use, we are running our code under `lib` not `src`, so compilation is necessary.

Compilation of blinksocks is ultra easy:

```
$ npm run compile
```

This will compile `src` to `lib`.

## Test in development

Any application support HTTP/Socks5/Socks4/Socks4a can be used for testing.

For example(use curl):

```
# Socks5
$ curl --socks5 localhost:1080 https://www.google.com
$ curl --socks5-hostname localhost:1080 https://www.google.com

# Socks4
$ curl --socks4 localhost:1080 https://www.google.com

# Socks4a
$ curl --socks4a localhost:1080 https://www.google.com

# HTTP
$ curl -x http://localhost:1080 https://www.google.com
```

## Run in production

Blinksocks can take advantages of [pm2](https://github.com/unitech/pm2) to run in the production.

Install `pm2` before running blinksocks in the production.

### Daemon mode

```
$ pm2 start blinksocks -- -c config.json
```

### Cluster mode

```
$ pm2 start blinksocks -i 3 -- -c config.json
```

## For Firefox/Google Chrome and more...

A common usage of blinksocks is used it on **browsers**, so I give an advise here.

For Google Chrome, [SwitchyOmega](https://github.com/FelisCatus/SwitchyOmega) extension is a great approach to use socks5 service.

For FireFox, you can configure proxy at `Settings - Advanced - Network - Proxy`.

## Deploy(Docker)

We use Docker to auto-deploy a blinksocks **server**.

### 1. Get image

You can build an image manually or pull it from docker hub:

* Build an image

```
$ docker build --tags blinksocks:latest .
```

* Pull from docker hub

```
$ docker pull blinksocks:latest
```

### 2. Run in a container

Container will expose `1080` port, so you must map a host port to `1080` via `-p`.

```
$ docker run -d -p 7777:1080 blinksocks:latest
```

## References

* [SOCKS4](http://www.openssh.com/txt/socks4.protocol)
* [SOCKS4a](http://www.openssh.com/txt/socks4a.protocol)
* [SOCKS5 RFC-1928](https://tools.ietf.org/rfc/rfc1928.txt)
* [HTTP/1.1 RFC-2616](https://tools.ietf.org/rfc/rfc2616.txt)

## Contributors

Micooz(Owner), micooz@hotmail.com

Waiting for more contributors...

## License

Apache License 2.0