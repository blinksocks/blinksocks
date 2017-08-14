# Configuration

## Template

You can use **blinksocks init** to generate `blinksocks.client.json` and `blinksocks.server.json`:

```
$ blinksocks init
```

**blinksocks.client.json**

```js
{
  // local hostname or ip address
  // For client, act as a Socks5/Socks4/HTTP server.
  // For server, act as a blinksocks server.
  "host": "localhost",
  // local port to be listen on
  "port": 1080,
  // a list of blinksocks/shadowsocks server(client side only)
  "servers": [
    {
      // allow to use this server or not
      "enabled": true,
      // the transport layer, "tcp" or "udp"
      "transport": "tcp",
      // server host name or ip address
      "host": "example.com",
      // server port
      "port": 4321,
      // a secret key for encryption/description
      "key": "qM]ns7?7rgxq$fyS",
      // presets to process data stream
      // DO NOT modify the first preset if you don't know what it is.
      // Take care the order of those presets, read the docs before changing them.
      "presets": [
        {
          // preset name
          "name": "ss-base",
          // preset parameters
          "params": {}
        },
        {
          "name": "ss-aead-cipher",
          "params": {
            "method": "aes-256-gcm",
            "info": "ss-subkey"
          }
        }
      ]
    }
  ],
  // an ip list of DNS server
  "dns": [],
  // DNS cache expiration time in seconds
  "dns_expire": 3600,
  // close inactive connection after timeout seconds
  "timeout": 600,
  // how many sub processes to create, default is 0(disable cluster mode)
  "workers": 0,
  // log at the level, "error", "warn", "info", "verbose", "debug" or "silly"
  "log_level": "info"
}
```

**blinksocks.server.json**

```js
{
  // local hostname or ip address
  // For client, act as a Socks5/Socks4/HTTP server.
  // For server, act as a blinksocks server.
  "host": "0.0.0.0",
  // local port to be listen on
  "port": 4321,
  // the transport layer, "tcp" or "udp"
  "transport": "tcp",
  // a secret key for encryption/description
  "key": "qM]ns7?7rgxq$fyS",
  // presets to process data stream
  // DO NOT modify the first preset if you don't know what it is.
  // Take care the order of those presets, read the docs before changing them.
  "presets": [
    {
      // preset name
      "name": "ss-base",
      // preset parameters
      "params": {}
    },
    {
      "name": "ss-aead-cipher",
      "params": {
        "method": "aes-256-gcm",
        "info": "ss-subkey"
      }
    }
  ],
  // an ip list of DNS server
  "dns": [],
  // DNS cache expiration time in seconds
  "dns_expire": 3600,
  // redirect data to here once preset fail to process(server side only)
  // Should be formed with "host:port".
  "redirect": "",
  // close inactive connection after timeout seconds
  "timeout": 600,
  // how many sub processes to create, default is 0(disable cluster mode)
  "workers": 0,
  // log at the level, "error", "warn", "info", "verbose", "debug" or "silly"
  "log_level": "info"
}
```

## Run blinksocks

To start a server or a client, you prepare a json or js file first, then supply it to `--config` or `-c`:

```
$ blinksocks -c blinksocks.client.json
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

For more information about presets, please check out [presets](../presets).

* Log Levels

The logging library [winston](https://github.com/winstonjs/winston) use
npm logging levels by default, you can choose one of them demand:

```
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
```

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

## Custom DNS servers

If you encounter **ENOTFOUND** every now and then, you would better custom dns servers via `dns` options:

```
{
  ...
  "dns": ["8.8.8.8"]
  ...
}
```

If no `dns` option or no ip provided in `dns`, blinksocks use system dns settings as usual.

See: https://github.com/blinksocks/blinksocks/issues/66

## Cluster Mode

You can enable cluster mode by setting `workers` greater than zero, cluster mode can take advantage of multi-core systems to handle the load.

`workers` is usually set to the number of cpu cores:

```
{
  ...
  "workers": 2
  ...
}
```
