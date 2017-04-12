# Config.json

To start a server or a client, you can prepare a configuration json file(`config.json` for example)
then supply it to `--config` or `-c`:

```
$ blinksocks -c config.json
```

## Template

```json
{
  "host": "localhost",
  "port": 1080,
  "servers": [
    "node1.test.com:7777",
    "node2.test.com:7777"
  ],
  "key": "oh my secret key",
  "frame": "origin",
  "frame_params": "",
  "crypto": "",
  "crypto_params": "",
  "protocol": "aead",
  "protocol_params": "aes-256-gcm,ss-subkey",
  "obfs": "",
  "obfs_params": "",
  "redirect": "",
  "timeout": 600,
  "profile": false,
  "watch": true,
  "log_level": "info"
}
```

## Description

|       FIELD      |                   DESCRIPTION                   |         EXAMPLE         |
|:-----------------|:------------------------------------------------|:------------------------|
| *host            | local ip address or domain name                 | "localhost"             |
| *port            | local port to bind                              | 1024-65535              |
| servers          | a list of blinksocks server                     | -                       |
| *key             | for encryption and decryption                   | -                       |
| frame            | frame preset                                    | "origin"                |
| frame_params     | parameters for frame preset                     | ""                      |
| crypto           | crypto preset                                   | ""                      |
| crypto_params    | parameters for crypto preset                    | ""                      |
| protocol         | protocol preset                                 | "aead"                  |
| protocol_params  | parameters for protocol preset                  | "aes-256-gcm,ss-subkey" |
| obfs             | obfs preset                                     | ""                      |
| obfs_params      | parameters for obfs preset                      | ""                      |
| redirect         | redirect requests to here when preset fail      | "127.0.0.1:80"          |
| timeout          | close inactive connection after timeout seconds | false                   |
| profile          | whether profile or not                          | false                   |
| watch            | watch --config for changes                      | true                    |
| log_level        | log level                                       | "info"                  |

> NOTE: `host`, `port`, and `key` must be set.

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

* Presets, Ciphers and Hashes

```
├── crypto
│   ├── none.js
│   └── openssl.js
├── frame
│   └── origin.js
├── obfs
│   ├── http.js
│   └── none.js
└── protocol
    ├── aead.js
    └── none.js
```

Please check out relevant [presets](src/presets), they are documented well.

* Log Levels

The logging library [winston](https://github.com/winstonjs/winston) use
npm logging levels by default, you can choose one of them demand:

```
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
```

## Hot reload config.json

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
  "crypto": "openssl",            // must be "openssl"
  "crypto_params": "aes-256-cfb", // method of shadowsocks
  "protocol": "",                 // must be ""
  "protocol_params": "",
  "obfs": "",                     // must be ""
  "obfs_params": ""
  ...
}
```

**AEAD Ciphers(Newer Versions)**

```
{
  ...
  "crypto": "",                               // must be ""
  "crypto_params": "",
  "protocol": "aead",                         // must be "aead"
  "protocol_params": "aes-256-gcm,ss-subkey", // method of shadowsocks
  "obfs": "",                                 // must be ""
  "obfs_params": ""
  ...
}
```

Please also check out [#27](https://github.com/blinksocks/blinksocks/issues/27) for ciphers we've
already implemented.
