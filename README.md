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

## Features

* Cross-platform: running on Linux, Windows and macOS.
* Lightweight proxy interfaces: Socks5/Socks4/Socks4a and HTTP.
* Multiple Transport Layers: TCP, UDP, [TLS] and [WebSocket].
* TLS/TLS/WebSocket [multiplexing].
* Convenient protocol [customization].
* Access Control List([ACL]) support.
* Built-In [shadowsocks], [shadowsocksR], [v2ray vmess] protocols.
* Out of the box distribution and deployment.
* [Dynamic Protocol Stack]\(**experimental**\).

## Getting Started

### Requirements

blinksocks is built on top of [Node.js](https://nodejs.org), if you want to use it in an ordinary way or do some hacking, please install **Node.js(v6.x and above)** on your operating system.

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

**npm version(require Node.js)**

```
$ blinksocks --help
```

**executable version(~~Node.js~~, not GUI)**

Tips: You can [download](https://github.com/blinksocks/blinksocks/releases) precompiled executables for different platforms and launch it directly without having Node.js installed.

```
$ ./blinksocks --help    // Linux and macOS
$ blinksocks.exe --help  // Windows
```

For configuring blinksocks, please refer to [Configuration](docs/config).

## Documents

### For Users

1. [Usage](docs/usage)
2. [Configuration](docs/config)
3. [Presets](docs/presets)

### For Developers

1. [Preparation](docs/development/preparation)
2. [Architecture](docs/development/architecture)
3. [Custom Preset](docs/development/custom-preset)
4. [Benchmark](docs/benchmark)

## Contributors

See [contributors](https://github.com/blinksocks/blinksocks/graphs/contributors).

## License

Apache License 2.0

[TLS]: docs/config#blinksocks-over-tls
[WebSocket]: docs/config#blinksocks-over-websocket
[multiplexing]: docs/config#multiplexing
[customization]: docs/development/custom-preset
[ACL]: docs/config#access-control-list
[shadowsocks]: docs/presets/RECOMMENDATIONS.md#work-with-shadowsocks
[shadowsocksR]: docs/presets/RECOMMENDATIONS.md#work-with-shadowsocksr
[v2ray vmess]: docs/presets/RECOMMENDATIONS.md#work-with-v2ray-vmess
[Dynamic Protocol Stack]: suites
