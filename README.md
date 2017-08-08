# blinksocks

[![version](https://img.shields.io/npm/v/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![downloads](https://img.shields.io/npm/dt/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![license](https://img.shields.io/npm/l/blinksocks.svg)](https://github.com/blinksocks/blinksocks/blob/master/LICENSE)
[![dependencies](https://img.shields.io/david/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![devDependencies](https://img.shields.io/david/dev/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)

[![Travis](https://img.shields.io/travis/blinksocks/blinksocks.svg)](https://travis-ci.org/blinksocks/blinksocks)
[![Coverage](https://img.shields.io/codecov/c/github/blinksocks/blinksocks/master.svg)](https://codecov.io/gh/blinksocks/blinksocks)
[![%e2%9d%a4](https://img.shields.io/badge/made%20with-%e2%9d%a4-ff69b4.svg)](https://github.com/blinksocks/blinksocks)

A framework for building composable proxy protocol stack. Inspired by [Shadowsocks](https://shadowsocks.org),
and [ShadowsocksR](https://github.com/shadowsocksr/shadowsocksr).

## Features

* HTTP/Socks5/Socks4/Socks4a using the same port
* Customizable Protocols([presets](docs/presets)): simple, composable, and flexible
* Cross-platform: running on Linux based, Windows and macOS
* Partially compatible with **shadowsocks** [#27](https://github.com/blinksocks/blinksocks/issues/27)
* Dynamic server switch

## GUI ready

For desktop use, you can download official [blinksocks-desktop](https://github.com/blinksocks/blinksocks-desktop),
a cross-platform GUI for blinksocks.

## Getting Started

### Requirements

blinksocks is built on top of [Node.js](https://nodejs.org), so please install Node.js(**greater than v6.x**) on your operating system.

### Install or Upgrade

You can get the latest pre-compiled library(including executables) of blinksocks from **yarn** or **npm**.

> NOTE: Node.js comes with npm installed so you don't have to install npm individually.

```
$ npm install -g blinksocks
```

### Without Install?

If you hate to install and want to get a even more portable version, we have one:

```
$ wget https://raw.githubusercontent.com/blinksocks/blinksocks/master/build/blinksocks.js
```

## Run blinksocks

**installed version**

```
$ blinksocks client -c blinksocks.client.json
```

**portable version**

```
$ node blinksocks.js -c blinksocks.client.json
```

For configuring blinksocks, please refer to [Configuration](docs/config).

## Documents

### For Users

1. [Usage](docs/usage)
2. [Configuration](docs/config)
3. [Presets](docs/presets)

### For Developers

1. [Steps](docs/development/steps)
2. [Principle](docs/development/principle)
3. [Architecture](docs/development/architecture)
4. [Performance (outdated)](docs/performance)

## Contributors

See [authors](AUTHORS).

## License

Apache License 2.0