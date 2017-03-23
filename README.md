# blinksocks

[![version](https://img.shields.io/npm/v/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![downloads](https://img.shields.io/npm/dt/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![license](https://img.shields.io/npm/l/blinksocks.svg)](https://github.com/blinksocks/blinksocks/blob/master/LICENSE)
[![dependencies](https://img.shields.io/david/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![devDependencies](https://img.shields.io/david/dev/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)

[![Travis](https://img.shields.io/travis/blinksocks/blinksocks.svg)](https://travis-ci.org/blinksocks/blinksocks)
[![Coverage](https://img.shields.io/codecov/c/github/blinksocks/blinksocks/master.svg)](https://codecov.io/gh/blinksocks/blinksocks)
[![%e2%9d%a4](https://img.shields.io/badge/made%20with-%e2%9d%a4-ff69b4.svg)](https://github.com/blinksocks/blinksocks)

[![micooz/blinksocks](http://dockeri.co/image/micooz/blinksocks)](https://hub.docker.com/r/micooz/blinksocks/)

Yet another Socks5 proxy, designed for speed :zap:. Inspired by [Shadowsocks](https://shadowsocks.org/en/index.html),
And [ShadowsocksR](https://github.com/shadowsocksr/shadowsocksr/tree/manyuser).

> Across the Great Wall we can reach every corner in the world.

## Documentation

* [Motivation](docs/motivation)
* [Principle](docs/principle)
* [Architecture](docs/architecture)
* [Middleware](docs/middleware)
* [Performance](docs/performance)
* [For-Developer](docs/developer)

## Features

* HTTP/Socks5/Socks4/Socks4a compatible
* Compatible with shadowsocks(only stream ciphers for now)
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

  Usage: blinksocks [command] [options]


  Commands:

    init           generate configuration pair randomly
    run [options]  start service
    help [cmd]     display help for [cmd]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

```

## Git-style sub-command

There are two sub-command to do different tasks:

* `blinksocks init`

```
$ blinksocks init
```

This will generate `blinksocks.client.json` and `blinksocks.server.json` pair with a random key and default settings.

* `blinksocks run`

```
$ blinksocks run --help

  Usage: blinksocks-run --host <host> --port <port> --key <key> [...]

  Options:

    -h, --help                           output usage information
    -V, --version                        output the version number
    -c, --config [file]                  a json format file for configuration
    --host <host>                        an ip address or a hostname to bind
    --port <port>                        where to listen on
    --servers [servers]                  a list of servers, split by comma
    --key <key>                          a key for encryption and decryption
    --frame [frame]                      a preset used in frame middleware, default: 'origin'
    --frame-params [crypto-params]       parameters for frame preset, default: ''
    --crypto [crypto]                    a preset used in crypto middleware, default: 'openssl'
    --crypto-params [crypto-params]      parameters for crypto, default: 'aes-256-cfb'
    --protocol [protocol]                a preset used in protocol middleware, default: 'aead'
    --protocol-params [protocol-params]  parameters for protocol, default: 'aes-256-cbc,sha256'
    --obfs [obfs]                        a preset used in obfs middleware, default: ''
    --obfs-params [obfs-params]          parameters for obfs, default: ''
    --log-level [log-level]              log level, default: 'silly'
    -q, --quiet                          force log level to 'error'
    --profile                            collect performance statistics, store at blinksocks.profile.log when exit


  Examples:
  
  As simple as possible:
    $ blinksocks run -c config.json
  
  To start a server:
    $ blinksocks run --host 0.0.0.0 --port 7777 --key password
  
  To start a client:
    $ blinksocks run --host localhost --port 1080 --servers node1.test.com:7777,node2.test.com:7777 --key password

```

## Config.json

To start a server or client, you can prepare a configuration json file(`config.json` for example) then supply to `--config` or `-c`.

```json
{
  "host": "localhost",
  "port": 6666,
  "servers": [
    "node1.test.com:7777",
    "node2.test.com:7777"
  ],
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

|       FIELD      |               DESCRIPTION                 |        DEFAULT       |
|:-----------------|:------------------------------------------|:---------------------|
| *host            | local ip address or domain name           | "localhost"          |
| *port            | local port to bind                        | 1080                 |
| servers          | a list of blinksocks server               | -                    |
| *key             | for encryption and decryption             | -                    |
| frame            | frame preset                              | "origin"             |
| frame_params     | parameters for frame preset               | ""                   |
| crypto           | crypto preset                             | ""                   |
| crypto_params    | parameters for crypto preset              | "aes-256-cfb"        |
| protocol         | protocol preset                           | "aead"               |
| protocol_params  | parameters for protocol preset            | "aes-256-cbc,sha256" |
| obfs             | obfs preset                               | "none"               |
| obfs_params      | parameters for obfs preset                | ""                   |
| log_level        | log level                                 | "error"              |

> NOTE: `host`, `port`, and `key` must be set.

* Presets, Ciphers and Hashes

Please check out relevant [presets](src/presets), they are documented well.

```
├── crypto
│   ├── none.js
│   └── openssl.js
├── frame
│   └── origin.js
├── obfs
│   ├── http.js
│   └── none.js
└── protocol
    ├── aead.js
    ├── aead2.js
    ├── basic.js
    └── none.js

```

* Log Levels

The logging library [winston](https://github.com/winstonjs/winston) use
npm logging levels by default, you can choose one of them demand:

```
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
```

## Run in production

Blinksocks can take advantages of [pm2](https://github.com/unitech/pm2) to run in the production.

Install `pm2` before running blinksocks in the production.

### Daemon mode

```
$ pm2 start blinksocks-run -- -c config.json
```

### Cluster mode

```
$ pm2 start blinksocks-run -i 3 -- -c config.json
```

## Work with shadowsocks

To work with shadowsocks, make sure you have set `protocol` to **none**:

```
{
  ...
  "crypto": "openssl",
  "crypto_params": "aes-256-cfb",
  "protocol": "none",
  "protocol_params": "",
  ...
}
```

That's all you need to concern!

## For Firefox/Google Chrome and more...

A common usage of blinksocks is used it on **browsers**, so I give an advise here.

For Google Chrome, [SwitchyOmega](https://github.com/FelisCatus/SwitchyOmega) extension is a great approach to use socks5 service.

For FireFox, you can configure proxy at `Settings - Advanced - Network - Proxy`.

## References

* [SOCKS4](http://www.openssh.com/txt/socks4.protocol)
* [SOCKS4a](http://www.openssh.com/txt/socks4a.protocol)
* [SOCKS5 RFC-1928](https://tools.ietf.org/rfc/rfc1928.txt)
* [HTTP/1.1 RFC-2616](https://tools.ietf.org/rfc/rfc2616.txt)

## License

Apache License 2.0