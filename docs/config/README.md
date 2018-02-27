# Configuration

## Auto Generate Configs

You can use the following command to generate `blinksocks.client.json` and `blinksocks.server.json`:

```
$ blinksocks init
```

**blinksocks.client.json**

```
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
    "mux": false,
    "mux_concurrency": 10
  },
  "dns": [],
  "dns_expire": 3600,
  "timeout": 221,
  "log_path": "bs-client.log",
  "log_level": "info",
  "log_max_days": 30
}
```

**blinksocks.server.json**

```
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

|        KEY         |                         DESCRIPTION                          |     DEFAULT     |                                  REMARKS                                   |
| :----------------- | :----------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------- |
| service            | local service address                                        | -               | `<protocol>://<host>:<port>[?params]`, e.g, "socks://127.0.0.1:1080"       |
| server             | remote server config                                         | -               | **CLIENT ONLY**                                                            |
| server.service     | remote service address                                       | -               | `<protocol>://<host>:<port>`                                               |
| server.key         | remote server master key                                     | -               | -                                                                          |
| presets            | an ordered list of presets to build a protocol stack         | -               | see [presets]                                                              |
| presets[i].name    | preset name                                                  | -               | -                                                                          |
| presets[i].params  | preset params                                                | -               | -                                                                          |
| tls_key            | private key for TLS                                          | -               | required on server if `<protocol>` is "tls"                                |
| tls_cert           | certificate for TLS                                          | -               | required on both client and server if `<protocol>` is "tls"                |
| acl                | enable access control list or not                            | false           | **SERVER ONLY**                                                            |
| acl_conf           | access control list configuration file                       | -               | **SERVER ONLY**, see below                                                 |
| timeout            | timeout for each connection                                  | 600             | in seconds                                                                 |
| mux                | enable multiplexing or not                                   | false           | -                                                                          |
| mux_concurrency    | the max mux connection established between client and server | 10              | **CLIENT ONLY**                                                            |
| redirect           | target address to redirect when preset fail to process       | ""              | **SERVER ONLY** `<host>:<port>`                                            |
| dns                | a list of DNS server IPs                                     | []              | -                                                                          |
| dns_expire         | in-memory DNS cache expiration time                          | 3600            | in seconds                                                                 |
| log_path           | log file path                                                | "bs-[type].log" | a relative/absolute directory or a file to put logs in                     |
| log_level          | log level                                                    | "info"          | ['error', 'warn', 'info', 'verbose', 'debug', 'silly']                     |
| log_max_days       | the max of days a log file will be saved                     | 30              | remove this option if you want to keep all log files                       |

### Service

`service` is a convenient way to specify what kind of service should be created **locally**.

The `<protocol>` should be:

* On client side: `tcp`, `socks`/`socks5`/`socks4`/`socks4a` or `http`/`https`
* On server side: `tcp`, `tls` or `ws`.

#### Service Params

**?forward=<host>:<port>**

You can proxy application data to a **permanent destination** via server by providing **?forward** parameter along with **tcp://** protocol:

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

### blinksocks over TLS

By default, blinksocks use "tcp" as transport, but you can take advantage of TLS technology to protect your data well.

To enable blinksocks over TLS, you should:

1. Generate `key.pem` and `cert.pem` on server

```
// self-signed
$ openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -out cert.pem -days 365
```

> NOTE: Remember the **Common Name** you entered in the command prompt.

2. Server config

Change `tcp://` to `tls://`, then provide `tls_key` and `tls_cert`:

```
{
  "service": "tls://<host>:<port>",
  "tls_key": "key.pem",
  "tls_cert": "cert.pem",
  ...
}
```

3. Client config

Change server's `tcp://` to `tls://`, then provide `tls_cert`:

```
{
  ...
  "server": {
    "service": "tls://<Common Name>:<port>", // take care of <Common Name>
    "tls_cert": "cert.pem",
    ...
  },
  ...
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
  "server": {
    "service": "ws://<host>:<port>",
    ...
  },
  ...
}
```

### Access Control List

You can enable ACL on **server** by setting **acl: true** and provide a acl configuration file in **acl_conf**:

```
{
  "acl": true,
  "acl_conf": "acl.txt",
  ...
}
```

**acl.txt** for example:

```
# [addr[/mask][:port]] [ban] [max_upload_speed(/s)] [max_download_speed(/s)]

example.com     1            # prevent access to example.com
example.com:*   1            # prevent access to example.com:*, equal to above
example.com:443 1            # prevent access to example.com:443 only
*:25            1            # prevent access to SMTP servers
*:*             1            # prevent all access from/to all endpoints
127.0.0.1       1            # ban localhost
192.168.0.0/16  1            # ban hosts in 192.168.*.*
172.27.1.100    0 120K       # limit upload speed to 120KB/s
172.27.1.100    0 -    120K  # limit download speed to 120KB/s
172.27.1.100    0 120K 120K  # limit upload and download speed to 120KB/s
```

Rules in **acl.txt** has a priority from lower to higher.

> NOTE: acl requires a restart each time you updated **acl_conf**.

### Multiplexing

Since blinksocks v2.9.0, blinksocks supports TCP/TLS/WS multiplexing.

You can enable this feature easily by setting `mux: true` on both client and server, and set `mux_concurrency: <number>` on client.

1. Server config

```
{
  "mux": true,
  ...
}
```

2. Client config

```
{
  ...
  "server": {
    ...
    "mux": true,
    "mux_concurrency": 10
   ...
  },
  ...
}
```

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

[presets]: ../presets
[winston]: https://github.com/winstonjs/winston
[UDP ASSOCIATE]: https://tools.ietf.org/html/rfc1928#section-4