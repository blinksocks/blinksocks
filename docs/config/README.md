# Configuration

## Auto Generate Configs

You can use the following command to generate `blinksocks.client.json` and `blinksocks.server.json`:

```
$ blinksocks init
```

**blinksocks.client.json**

```json
{
  "service": "socks5://127.0.0.1:1080",
  "server": {
    "service": "tcp://127.0.0.1:19997",
    "key": "<=p(^tr;DpEfVe<m",
    "presets": [
      {
        "name": "ss-base"
      },
      {
        "name": "obfs-random-padding"
      },
      {
        "name": "ss-stream-cipher",
        "params": {
          "method": "aes-128-ctr"
        }
      }
    ],
    "tls_cert": "cert.pem",
    "tls_cert_self_signed": false,
    "mux": false,
    "mux_concurrency": 10
  },
  "https_key": "https_key.pem",
  "https_cert": "https_cert.pem",
  "dns": [],
  "dns_expire": 3600,
  "timeout": 221,
  "log_path": "bs-client.log",
  "log_level": "info",
  "log_max_days": 30
}
```

**blinksocks.server.json**

```json
{
  "service": "tcp://0.0.0.0:19997",
  "key": "<=p(^tr;DpEfVe<m",
  "presets": [
    {
      "name": "ss-base"
    },
    {
      "name": "obfs-random-padding"
    },
    {
      "name": "ss-stream-cipher",
      "params": {
        "method": "aes-128-ctr"
      }
    }
  ],
  "tls_key": "key.pem",
  "tls_cert": "cert.pem",
  "mux": false,
  "dns": [],
  "dns_expire": 3600,
  "timeout": 221,
  "redirect": "",
  "log_path": "bs-server.log",
  "log_level": "info",
  "log_max_days": 30
}
```

|         KEY          |                         DESCRIPTION                          |     DEFAULT     |                           REMARKS                           |
| :------------------- | :----------------------------------------------------------- | :-------------- | :---------------------------------------------------------- |
| service              | local service address                                        | -               | [WHATWG URL] e.g, "socks://127.0.0.1:1080"                  |
| server               | remote server config                                         | -               | **CLIENT ONLY**                                             |
| server.service       | remote service address                                       | -               | [WHATWG URL] e.g, "tls://example.com:443"                   |
| server.key           | remote server master key                                     | -               | -                                                           |
| presets              | an ordered list of presets to build a protocol stack         | -               | see [presets]                                               |
| presets[i].name      | preset name                                                  | -               | -                                                           |
| presets[i].params    | preset params                                                | -               | -                                                           |
| tls_key              | private key path for TLS                                     | -               | required on server if `<protocol>` is "tls"                 |
| tls_cert             | certificate path for TLS                                     | -               | required on both client and server if `<protocol>` is "tls" |
| tls_cert_self_signed | whether "tls_cert" is `self-signed` or not                   | false           | **CLIENT ONLY**                                             |
| https_key            | private key path for HTTPS                                   | -               | **CLIENT ONLY**                                             |
| https_cert           | certificate path for HTTPS                                   | -               | **CLIENT ONLY**                                             |
| timeout              | timeout for each connection                                  | 600             | in seconds                                                  |
| mux                  | enable multiplexing or not                                   | false           | -                                                           |
| mux_concurrency      | the max mux connection established between client and server | 10              | **CLIENT ONLY**                                             |
| redirect             | target address to redirect when preset fail to process       | ""              | **SERVER ONLY** `<host>:<port>`                             |
| dns                  | a list of DNS server IPs                                     | []              | -                                                           |
| dns_expire           | in-memory DNS cache expiration time                          | 3600            | in seconds                                                  |
| log_path             | log file path                                                | "bs-[type].log" | a relative/absolute file path to put logs in                |
| log_level            | log level                                                    | "info"          | ['error', 'warn', 'info', 'verbose', 'debug', 'silly']      |
| log_max_days         | the max of days a log file will be saved                     | 30              | remove this option if you want to keep all log files        |

### Service

`service` is a [WHATWG URL] that includes what kind of service should be created **locally**.

The `<protocol>` should be:

* On client side: `tcp`, `socks`/`socks5`/`socks4`/`socks4a`, `http` or `https`.
* On server side: `tcp`, `tls`, `ws`, `wss` or `h2`.

#### Service Authentication (client side only)

* Create a **http/https** service with [Basic Authentication](https://www.iana.org/go/rfc7617).

```
// blinksocks.client.json
{
  "service": "http://user:pass@localhost:1080",
  ...
}
```

* Create a **socks5** service with [Username/Password Authentication](https://tools.ietf.org/html/rfc1929).

```
// blinksocks.client.json
{
  "service": "socks5://user:pass@localhost:1080",
  ...
}
```

#### Service Params (client side only)

**?forward=<host>:<port>**

When use `tcp://` protocol, you can proxy application data to a **permanent destination** via server by providing **?forward** parameter:

```
// blinksocks.client.json
{
  "service": "tcp://localhost:1080?forward=localhost:1082",
  "server": {
    "service": "tcp://localhost:1081",
    "presets": [...],
    ...
  },
  ...
}
```

Then it built:

```
applications <----> [blinksocks client] <----> [blinksocks server] <----> localhost:1082
 (iperf -c)           localhost:1080             localhost:1081             (iperf -s)
```

In this case, it uses [iperf](https://en.wikipedia.org/wiki/Iperf) to test network performance between client and server through different protocol stack.

> Note that on client side, `tcp://` cannot obtain proxy destination by itself, so you MUST provide **?forward** in service as well.

### Presets

`presets` is a list of procedures which builds a specific protocol stack, each preset must be defined as:

```json
{
  "name": "preset-name",
  "params": {
    "key": "value"
  }
}
```

`presets` process data stream from the first to the last. You can add/remove/modify them freely.

For more information about presets, please check out [presets].

### Log Path

Specify a relative or absolute path to store log file, if no `log_path` provided, log file named `bs-[type].log` will be stored in the working directory.

### Log Levels

The logging library [winston] use npm logging levels by default, you can choose one of them on demand:

```
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
```

### DNS servers

If you encounter **ENOTFOUND** every now and then, you can custom dns servers via `dns` options:

```
{
  ...
  "dns": ["8.8.8.8", "4.4.4.4"]
  ...
}
```

If no `dns` option or no ip provided in `dns`, blinksocks use system dns settings as usual.

See: https://github.com/blinksocks/blinksocks/issues/66

### UDP Relay

UDP relay is supported since blinksocks v2.8.0, and it's enabled by default on client and server. UDP relay is prepared only for applications who support Socks5 [UDP ASSOCIATE].

Note that Socks5 requires to relay UDP message over UDP, so does blinksocks:

```
apps <--SOCKS5--> [blinksocks client] <--UDP--> [blinksocks server] <--UDP--> dests
```

[WHATWG URL]: https://nodejs.org/dist/latest/docs/api/url.html#url_url_strings_and_url_objects
[presets]: ../presets
[winston]: https://github.com/winstonjs/winston
[UDP ASSOCIATE]: https://tools.ietf.org/html/rfc1928#section-4
