# Configuration

To start a server or a client, you prepare a json or js file(`config.json/config.js` for example) first,
then supply it to `--config` or `-c`:

```
$ blinksocks -c config.js
```

## Template

**config.json**

```json
{
  "host": "localhost",
  "port": 1080,
  "servers": [
    "node1.example.com:7777",
    "node2.example.com:7778"
  ],
  "key": "oh my secret key",
  "presets": [
    {
      "name": "ss-base",
      "params": {}
    },
    {
      "name": "ss-aead-cipher",
      "params": {
        "method": "aes-128-gcm",
        "info": "ss-subkey"
      }
    }
  ],
  "redirect": "",
  "timeout": 600,
  "log_level": "silly",
  "profile": false,
  "watch": true
}
```

**config.js**

```js
module.exports = {
  ...
};
```

## Description

|       FIELD      |                      DESCRIPTION                      |         EXAMPLE         |
|:-----------------|:------------------------------------------------------|:------------------------|
| *host            | local ip address or domain name                       | "localhost"             |
| *port            | local port to bind                                    | 1024-65535              |
| servers          | a list of blinksocks server                           | -                       |
| *key             | for encryption and decryption                         | -                       |
| *presets         | a list of presets use in middlewares                  | -                       |
| redirect         | redirect requests to here once preset fail to process | "127.0.0.1:80"          |
| timeout          | close inactive connection after timeout seconds       | false                   |
| log_level        | log level                                             | "info"                  |
| profile          | whether profile or not                                | false                   |
| watch            | watch --config for changes                            | true                    |

> NOTE: field marked with \* must be set.

* Servers(Client Side Only)

`servers` includes multiple servers, a server must either be formed with `ip:port` or `hostname:port`.

You can temporary disable servers by prefixing a '-':

```
{
  ...
  "servers": [
    "123.123.123.123:8080",
    "example.com:4545",
    "-disabled.thisone.com:4545" // disable this one temporary
  ],
  ...
}
```

Blinksocks will detect which server is the fastest in a fixed interval using [balancer.js](../../src/core/balancer.js).

* Presets

`presets` is a list, a preset is defined as:

```json
{
  "name": "preset-name",
  "params": {
    "key": "value"
  }
}
```

Please check out relevant [presets](../../src/presets), they are documented well.

* Log Levels

The logging library [winston](https://github.com/winstonjs/winston) use
npm logging levels by default, you can choose one of them demand:

```
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
```

## Hot reload

`--watch` is enabled by default, this means when file specified by `-c` or `--config` has been modified,
blinksocks will hot-reload it without stop-the-world.

```
$ blinksocks client -c config.json --watch
```

> NOTE that if you change `host` or `port`, a restart is required.

## Redirect(Server Side Only)

You can specify a `redirect` location to tell blinksocks **server** where to relay unexpected data received
from client.

`redirect` must either be formed with `ip:port` or `hostname:port`. For example:

```
{
  ...
  "redirect": "localhost:80"
  ...
}
```

If `redirect` is not provided, connection will be closed after random seconds when server fail to process.

## Work with shadowsocks

To work with **shadowsocks**, please choose one of the following configuration:

**Steam Ciphers(Older Versions)**

```
{
  ...
  "presets": [{
    "name": "ss-base",
    "params": {}
  }, {
    "name": "ss-stream-cipher",
    "params": {
      "method": "aes-256-cfb"
    }
  }],
  ...
}
```

**AEAD Ciphers(Newer Versions)**

```
{
  ...
  "presets": [{
    "name": "ss-base",
    "params": {}
  }, {
    "name": "ss-aead-cipher",
    "params": {
      "method": "aes-256-gcm",
      "info": "ss-subkey"
    }
  }],
  ...
}
```

Please also check out [#27](https://github.com/blinksocks/blinksocks/issues/27) for ciphers we've
already implemented.
