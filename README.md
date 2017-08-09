# blinksocks

[![version](https://img.shields.io/npm/v/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![downloads](https://img.shields.io/npm/dt/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![license](https://img.shields.io/npm/l/blinksocks.svg)](https://github.com/blinksocks/blinksocks/blob/master/LICENSE)
[![dependencies](https://img.shields.io/david/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![devDependencies](https://img.shields.io/david/dev/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)

[![Travis](https://img.shields.io/travis/blinksocks/blinksocks.svg)](https://travis-ci.org/blinksocks/blinksocks)
[![Coverage](https://img.shields.io/codecov/c/github/blinksocks/blinksocks/master.svg)](https://codecov.io/gh/blinksocks/blinksocks)
[![%e2%9d%a4](https://img.shields.io/badge/made%20with-%e2%9d%a4-ff69b4.svg)](https://github.com/blinksocks/blinksocks)

A framework for building composable proxy protocol stack.

## Features

* Simple proxy interfaces for Socks5/Socks4/Socks4a and HTTP
* Customizable Protocols(using [presets](docs/presets)): simple, composable, and flexible
* Cross-platform: running on Linux based, Windows and macOS
* Portable/Executable versions available
* Partially compatible with **shadowsocks** [#27](https://github.com/blinksocks/blinksocks/issues/27)

## GUI ready

For desktop use, you can download official [blinksocks-desktop](https://github.com/blinksocks/blinksocks-desktop),
a cross-platform GUI for blinksocks.

## Executables ready(Not GUI)

You can download precompiled executables for different platforms and use it directly without having Node.js installed:

[Download](https://github.com/blinksocks/blinksocks/releases).

## Getting Started

### Requirements

blinksocks is built on top of [Node.js](https://nodejs.org), if you want to use it in an ordinary way or do some hacking,
please install Node.js(**v6.x and above**) on your operating system.

### Install or Upgrade

You can get the latest blinksocks via package manager **yarn** or **npm**.

> NOTE: Node.js comes with npm installed so you don't have to install npm individually.

```
$ npm install -g blinksocks
```

### Without yarn or npm?

If you hate to install and want to get a even more portable version, we have one:

```
$ wget https://raw.githubusercontent.com/blinksocks/blinksocks/master/build/blinksocks.js
```

## Run blinksocks

**installed version(require Node.js)**

```
$ blinksocks client -c blinksocks.client.json
```

**portable version(require Node.js)**

```
$ node blinksocks.js -c blinksocks.client.json
```

**executable version(~~Node.js~~)**

```
$ ./blinksocks(.exe) --help
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