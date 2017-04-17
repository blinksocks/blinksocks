# Configuration

## Template

You can use blinksocks init to generate `blinksocks.client.js` and `blinksocks.server.js`:

```
$ blinksocks init
```

**blinksocks.client.js**

```js
module.exports = {

  // local hostname or ip address
  //
  // @note
  //   1. For client, act as a Socks5/Socks4/HTTP server.
  //   2. For server, act as a blinksocks server.
  host: "localhost",

  // local port to be listen on
  port: 1080,

  // a list of blinksocks/shadowsocks server(client side only)
  servers: [
    {
      // allow to use this server or not
      enabled: true,

      // server host name or ip address
      host: "example.com",

      // server port
      port: 5678,

      // a secret key for encryption/description
      key: "j+b3)I<h#c1_Jl^c",

      // presets to process data stream
      //
      // @note
      //   1. DO NOT modify the first preset if you don't know what it is.
      //   2. Take care the order of those presets, read the docs before changing them.
      presets: [
        {
          // preset name
          name: "ss-base",

          // preset parameters
          params: {}
        },
        {
          name: "ss-aead-cipher",
          params: {
            method: "aes-256-gcm",
            info: "ss-subkey"
          }
        }
      ]
    }
  ],

  // close inactive connection after timeout seconds
  timeout: 600,

  // collect performance statistics
  profile: false,

  // hot-reload when this file changed
  watch: true,

  // log at the level
  //
  // @note
  //   1. should be one of [error, warn, info, verbose, debug, silly]
  log_level: "info"

};
```

**blinksocks.server.js**

```js
module.exports = {

  // local hostname or ip address
  //
  // @note
  //   1. For client, act as a Socks5/Socks4/HTTP server.
  //   2. For server, act as a blinksocks server.
  host: "0.0.0.0",

  // local port to be listen on
  port: 5678,

  // a secret key for encryption/description
  key: "j+b3)I<h#c1_Jl^c",

  // presets to process data stream
  //
  // @note
  //   1. DO NOT modify the first preset if you don't know what it is.
  //   2. Take care the order of those presets, read the docs before changing them.
  presets: [
    {
      // preset name
      name: "ss-base",

      // preset parameters
      params: {}
    },
    {
      name: "ss-aead-cipher",
      params: {
        method: "aes-256-gcm",
        info: "ss-subkey"
      }
    }
  ],

  // redirect data stream to here once preset fail to process(server side only)
  //
  // @note
  //   1. Should be formed with "host:port".
  redirect: "",

  // close inactive connection after timeout seconds
  timeout: 600,

  // collect performance statistics
  profile: false,

  // hot-reload when this file changed
  watch: true,

  // log at the level
  //
  // @note
  //   1. should be one of [error, warn, info, verbose, debug, silly]
  log_level: "info"

};
```

## Run blinksocks

To start a server or a client, you prepare a json or js file first, then supply it to `--config` or `-c`:

```
$ blinksocks client -c blinksocks.client.js
```

* Servers(Client Side Only)

`servers` is a list of blinksocks/shadowsocks servers. Each server consist of `enabled`, `host`, `port`, `key` and `presets`.

You can temporary disable a server by setting `enabled: false`.

Blinksocks will detect which server is the fastest in intervals using [balancer.js](../../src/core/balancer.js).

* Presets

`presets` is a list of procedures, each preset is defined as:

```json
{
  "name": "preset-name",
  "params": {
    "key": "value"
  }
}
```

`presets` are chaining from the first to the last, and are almost free to compose.

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
