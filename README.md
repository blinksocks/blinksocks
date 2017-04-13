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

Yet another secure proxy, designed for speed :zap:. Inspired by [Shadowsocks](https://shadowsocks.org),
and [ShadowsocksR](https://github.com/shadowsocksr/shadowsocksr).

> Across the Great Wall we can reach every corner in the world.

## Features

* HTTP/Socks5/Socks4/Socks4a using the same port
* Partially compatible with **shadowsocks** [#27](https://github.com/blinksocks/blinksocks/issues/27)
* Flexible, customizable and pluggable
* Running on Linux based, Windows and macOS
* Docker integration

## Quick Start

```
$ blinksocks server -c blinksocks.config.js
```

```js
// blinksocks.config.js

module.exports = {
  "host": "localhost",
  "port": 1080,
  "servers": [{
    "bs.example.com:1234"
  }],
  "key": "(m-p14a=*&*/P^n?",
  "presets": [
    {"name": "ss-base", "params": {}},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm", "info": "ss-subkey"}
  }],
  "redirect": "",
  "timeout": 600,
  "log_level": "info",
  "profile": false,
  "watch": true
};
```

## Documents

1. [Getting Started](docs/tutorials)
2. [Usage](docs/usage)
3. [Configuration](docs/config)
4. [Development](docs/development)
5. [Performance](docs/performance)

## Contributors

See [authors](AUTHORS).

## License

Apache License 2.0