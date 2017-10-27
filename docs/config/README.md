# Configuration

## Auto Generate Configs

You can use the following command to generate `blinksocks.client.json` and `blinksocks.server.json`:

```
$ blinksocks init
```

|               KEY               |                  DESCRIPTION                  | OPTIONAL |     DEFAULT     |                                REMARKS                                 |
| :------------------------------ | :-------------------------------------------- | :------- | :-------------- | :--------------------------------------------------------------------- |
| service                         | local service address                         | *        | -               | PROTOCOL://HOST:PORT, e.g, "socks://127.0.0.1:1080"                    |
| dstaddr                         | an address to tell server where to relay data | *        | -               | must be set on client side if PROTOCOL is "tcp"                        |
| dstaddr.host                    | destination host                              | *        | -               | -                                                                      |
| dstaddr.port                    | destination port                              | *        | -               | -                                                                      |
| ~~host(deprecated)~~            | local hostname or ip address                  | *        | -               | if not set, make sure "service" is provided                            |
| ~~port(deprecated)~~            | local port                                    | *        | -               | if not set, make sure "service" is provided                            |
| ~~transport(deprecated)~~       | the transport layer                           | Yes      | "tcp"           | "tcp", "tls" or "ws"                                                   |
| servers                         | a list of server                              | Yes      | -               | **CLIENT ONLY**                                                        |
| servers[i].enabled              | allow to use this server or not               | -        | -               | -                                                                      |
| servers[i].service              | see service above                             | -        | -               | -                                                                      |
| ~~servers[i].host(deprecated)~~ | server hostname or ip address                 | -        | -               | -                                                                      |
| ~~servers[i].port(deprecated)~~ | server port                                   | -        | -               | -                                                                      |
| servers[i].key                  | server key for encryption                     | -        | -               | -                                                                      |
| presets                         | preset list in order                          | -        | -               | see [presets]                                                          |
| presets[i].name                 | preset name                                   | -        | -               | -                                                                      |
| presets[i].params               | preset params                                 | -        | -               | -                                                                      |
| tls_key                         | private key for TLS                           | -        | -               | required on server if "transport" or PROTOCOL is "tls"                 |
| tls_cert                        | server certificate                            | -        | -               | required on both client and server if "transport" or PROTOCOL is "tls" |
| timeout                         | timeout for each connection                   | Yes      | 600             | in seconds                                                             |
| redirect                        | target to redirect when preset fail           | Yes      | ""              | <host>:<port>                                                          |
| workers                         | the number of sub-process                     | Yes      | 0               | enable cluster mode when workers > 0                                   |
| dns                             | an ip list of DNS server                      | Yes      | []              | -                                                                      |
| dns_expire                      | DNS cache expiration time                     | Yes      | 3600            | in seconds                                                             |
| log_path                        | log file path                                 | Yes      | "bs-[type].log" | a relative or absolute directory or file                               |
| log_level                       | log level                                     | Yes      | "info"          | ['error', 'warn', 'info', 'verbose', 'debug', 'silly']                 |
| log_max_days                    | the max of days a log file will be saved      | Yes      | 30              | remove this option if you want to keep all log files                   |

### Service

`service` is a convenient way to specify which service should be created **locally**, made up of `PROTOCOL://HOST:PORT`.

The `PROTOCOL` should be `tcp`, `socks`(aliases: `socks5`, `socks4`, `socks4a`), `http`(aliases: `https`) on client side, and `tcp`, `tls`, `ws` on server side.

### Dstaddr

This option is used for directional proxy which transfers original traffic via server to a **permanent destination**.

```
// blinksocks.client.json
{
  "service": "tcp://localhost:1080",
  "dstaddr": {
    "host": "localhost",
    "port": 1082
  },
  "servers": [{
    "enabled": true,
    "service": "tcp://localhost:1081",
    "presets": [...],
    ...
  }],
  ...
}
```

Then it built:

```
applications <----> [blinksocks client] <----> [blinksocks server] <----> localhost:1082
 (iperf -c)           localhost:1080             localhost:1081             (iperf -s)
```

In this case, it's useful to use [iperf](https://en.wikipedia.org/wiki/Iperf) to test network performance between client and server through different presets.

Note that local protocol `tcp://` cannot obtain proxy destination by itself, so you MUST provide **dstaddr** as well in client configuration.

### Servers(Client Side Only)

`servers` is a list of blinksocks/shadowsocks servers. Each server consists at least `enabled`, `host`, `port`, `key` and `presets`.

You can temporary disable a server by setting `enabled: false`.

blinksocks will detect which server is the fastest in intervals using [balancer.js].

### Presets

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

For usage about presets, please check out [presets].

### blinksocks over TLS

By default, blinksocks use "tcp" as transport, but you can also take advantage of TLS technology to protect your data. To use blinksocks over TLS, you should:

1. Generate `key.pem` and `cert.pem` on server

```
// self-signed
$ openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -out cert.pem -days 365
```

> NOTE: Remember the **Common Name** you entered in the command prompt.

2. Server config

```
{
  "service": "tls://<host>:<port>",
  "tls_key": "key.pem",
  "tls_cert": "cert.pem",
  ...
}
```

3. Client config

```
{
  ...
  "servers": [{
    ...
    "service": "tls://<Common Name>:<port>", // note here
    "tls_cert": "cert.pem",
    ...
  }],
  ...
}
```

4. How about presets?

You don't have to use extra encryption when transport is "tls", your data is already protected by TLS, so just set "base" preset:

```
{
  "presets": [{"name": "ss-base"}]
}
```

### blinksocks over WebSocket

Like blinksocks over TLS, it's much easier to setup a websocket tunnel:

1. Server config

```
{
  "service": "ws://<host>:<port>",
  ...
}
```

2. Client config

```
{
  ...
  "servers": [{
    ...
    "service": "ws://<host>:<port>",
    ...
  }],
  ...
}
```

3. How about presets?

Although data sent from client is masked(according to [RFC-6455]), you should add cipher presets to ensure confidentiality because websocket server will transfer your data in plain text by default.

### Log Path

Specify a relative or absolute path to store log file, if no `log_path` provided, log file named `bs-[type].log` will be stored in the working directory.

### Log Levels

The logging library [winston] use npm logging levels by default, you can choose one of them demand:

```
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
```

### Custom DNS servers

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

### Cluster Mode

You can enable cluster mode by setting `workers` greater than zero, cluster mode can take advantage of multi-core systems to handle the load.

`workers` is usually set to the number of cpu cores:

```
{
  ...
  "workers": 2
  ...
}
```

### UDP Relay

UDP relay is supported since blinksocks v2.8.0, and it's enabled by default on client and server. UDP relay is prepared only for applications who support Socks5 [UDP ASSOCIATE].

Note that Socks5 requires to relay UDP message over UDP, so does blinksocks:

```
apps <--SOCKS5--> [blinksocks client] <--UDP--> [blinksocks server] <--UDP--> dests
```

[balancer.js]: ../../src/core/balancer.js
[presets]: ../presets
[winston]: https://github.com/winstonjs/winston
[RFC-6455]: https://tools.ietf.org/html/rfc6455
[UDP ASSOCIATE]: https://tools.ietf.org/html/rfc1928#section-4