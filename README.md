# blinksocks

[![version](https://img.shields.io/npm/v/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![downloads](https://img.shields.io/npm/dt/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![license](https://img.shields.io/npm/l/blinksocks.svg)](https://github.com/blinksocks/blinksocks/blob/master/LICENSE)
[![dependencies](https://img.shields.io/david/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![devDependencies](https://img.shields.io/david/dev/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)

[![Travis](https://img.shields.io/travis/blinksocks/blinksocks.svg)](https://travis-ci.org/blinksocks/blinksocks)
[![Coverage](https://img.shields.io/codecov/c/github/blinksocks/blinksocks/master.svg)](https://codecov.io/gh/blinksocks/blinksocks)
[![%e2%9d%a4](https://img.shields.io/badge/made%20with-%e2%9d%a4-ff69b4.svg)](https://github.com/blinksocks/blinksocks)

> A framework for building composable proxy protocol stack.

![](docs/blinksocks.png)

> Looking for GUI? Here it is: https://github.com/blinksocks/blinksocks-gui

## Features

* Cross-platform: running on Linux, Windows and macOS.
* Lightweight proxy interfaces: Socks5/Socks4/Socks4a and HTTP/HTTPS.
* Transport Layer Support: TCP, UDP, [TLS], [HTTP2], [WebSocket] and [WebSocket/TLS].
* TCP/TLS/HTTP2/WebSocket [multiplexing].
* Convenient protocol [customization].
* Access Control List([ACL]) support.
* Built-In [shadowsocks], [shadowsocksR], [v2ray vmess] protocols.
* Out of the box distribution and deployment.

## Getting Started

### Requirements

- [Node.js](https://nodejs.org) `v8.4.x` and above.

### Install or Upgrade

You can get the latest blinksocks via package manager **yarn** or **npm**.

> NOTE: Node.js comes with npm installed so you don't have to install npm individually.

**latest stable version**

```
$ npm install -g blinksocks
```

**nightly releases**

Please check out [blinksocks-nightly-releases](https://github.com/blinksocks/blinksocks-nightly-releases).

## Run blinksocks

```
$ blinksocks --help
```

For configuring blinksocks, please refer to [Configuration](docs/config).

## Documents

### For Users

1. [Usage](docs/usage)
2. [Configuration](docs/config)
3. [Presets](docs/presets)
4. [Examples](docs/examples)

### For Developers

1. [Preparation](docs/development/preparation)
2. [Architecture](docs/development/architecture)
3. [API](docs/development/api)
4. [Benchmark](docs/benchmark)

## Contributors

See [contributors](https://github.com/blinksocks/blinksocks/graphs/contributors).

## License

Apache License 2.0

[customization]: docs/development/api
[ACL]: docs/config#access-control-list
[TLS]: docs/examples/tls
[HTTP2]: docs/examples/http2
[WebSocket]: docs/examples/websocket
[WebSocket/TLS]: docs/examples/websocket-tls
[multiplexing]: docs/examples/multiplexing
[shadowsocks]: docs/examples/shadowsocks
[shadowsocksR]: docs/examples/shadowsocksr
[v2ray vmess]: docs/examples/v2ray-vmess
