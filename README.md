# blinksocks

[![version](https://img.shields.io/npm/v/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![downloads](https://img.shields.io/npm/dt/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![license](https://img.shields.io/npm/l/blinksocks.svg)](https://github.com/blinksocks/blinksocks/blob/master/LICENSE)
[![dependencies](https://img.shields.io/david/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![devDependencies](https://img.shields.io/david/dev/blinksocks/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)

[![Travis](https://img.shields.io/travis/blinksocks/blinksocks.svg)](https://travis-ci.org/blinksocks/blinksocks)
[![Coverage](https://img.shields.io/codecov/c/github/blinksocks/blinksocks/master.svg)](https://codecov.io/gh/blinksocks/blinksocks)
[![%e2%9d%a4](https://img.shields.io/badge/made%20with-%e2%9d%a4-ff69b4.svg)](https://github.com/blinksocks/blinksocks)

A proxy framework for building composable protocol stack. Inspired by [Shadowsocks](https://shadowsocks.org),
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

## Quick Start

```
$ blinksocks client -c blinksocks.client.js
```

```js
// blinksocks.client.js
module.exports = {
  host: "localhost",
  port: 1080,
  servers: [{
    enabled: true,
    transport: 'tcp',
    host: "bs.example.com",
    port: 6858,
    key: "qtPb2edK7yd7e]<K",
    presets: [
      {name: "ss-base", params: {}},
      {name: "ss-aead-cipher", params: {method: "aes-256-gcm", info: "ss-subkey"}}
    ]
  }],
  dns: ['8.8.8.8'],
  timeout: 600,
  profile: false,
  watch: true,
  log_level: "info"
};
```

## Documents

### For Users

1. [Getting Started](docs/tutorials)
2. [Usage](docs/usage)
3. [Configuration](docs/config)
4. [Presets](docs/presets)

### For Developers

1. [Steps](docs/development/steps)
2. [Principle](docs/development/principle)
3. [Architecture](docs/development/architecture)
4. [Performance (outdated)](docs/performance)

## Contributors

See [authors](AUTHORS).

## License

Apache License 2.0