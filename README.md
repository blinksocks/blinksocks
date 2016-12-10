# blinksocks

[![version](https://img.shields.io/npm/v/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![downloads](https://img.shields.io/npm/dt/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![license](https://img.shields.io/npm/l/blinksocks.svg)](https://github.com/micooz/blinksocks/blob/master/LICENSE)
[![dependencies](https://img.shields.io/david/micooz/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)
[![devDependencies](https://img.shields.io/david/dev/micooz/blinksocks.svg)](https://www.npmjs.com/package/blinksocks)

[![Travis](https://img.shields.io/travis/micooz/blinksocks.svg)](https://travis-ci.org/micooz/blinksocks)
[![Coverage](https://img.shields.io/codecov/c/github/micooz/blinksocks/master.svg)](https://codecov.io/gh/micooz/blinksocks)
[![%e2%9d%a4](https://img.shields.io/badge/made%20with-%e2%9d%a4-ff69b4.svg)](https://github.com/micooz/blinksocks)

Yet another socks5 proxy, designed for speed :zap:.

> Across the Great Wall we can reach every corner in the world.

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
```

### Options

The options are quite simple at present:

```

  Usage: blinksocks [options] [...]

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -c, --config <file>  a json file for configuration
    --ciphers            show all supported ciphers on the current platform

```

## Configuration

To start a server/client, you must specify a configuration json file(`config.json` for example) via `--config` or `-c`.

For **Client**, the file looks like:

```
{
  "host": "localhost",
  "port": 1080,
  "server_host": "example.com",
  "server_port": 7777,
  "password": "my secret password",
  "cipher": "aes-256-cfb",
  "log_level": "error"
}
```

For **Server**, the file looks like(without `server_host` and `server_port`):

```
{
  "host": "0.0.0.0",
  "port": 7777,
  "password": "my secret password",
  "cipher": "aes-256-cfb",
  "log_level": "error"
}
```

`log_level` should take a value from Loggin Level of
[Log4js.Level](http://stritti.github.io/log4js/docu/users-guide.html#configuration).

The levels are case-insensitive and cumulative.

## Examples

Once prepared the `config.json`, you can start a service by a simple command:

```
$ blinksocks -c config.json
```

## Compile

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
$ curl --socks5-hostname localhost:1080 https://www.google.com
```

## For Firefox/Google Chrome and more...

A common usage of blinksocks is used it on **browsers**, so I give an advise here.

For Google Chrome, [SwitchyOmega](https://github.com/FelisCatus/SwitchyOmega) extension is a great approach to use socks5 service.

For FireFox, you can configure proxy at `Settings - Advanced - Network - Proxy`.

## Documentation

If you are interesting in `Principle` or `Architecture` of blinksocks, please

check this out: [docs](https://github.com/micooz/blinksocks/tree/master/docs).

## Roadmap

Done:

* [x] non-encryption mode for debugging and non-security scenarios.

Next major version(**v2.0.0**):

* [ ] encrypt/decrypt blocks with iv
* [ ] streaming data send/receive
* [ ] UDP relay
* [ ] DNS cache
* [ ] more command line options

Further versions:

* [ ] multiple servers
* [ ] ip ban
* [ ] add daemon
* [ ] more tests
* [ ] more docs
* [ ] ...

## Contributors

Micooz(Owner), micooz@hotmail.com

Waiting for more contributors...

## License

Apache License 2.0