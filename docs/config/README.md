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
  "protocol_params": "aes-256-cbc,sha256",
  "obfs": "",
  "obfs_params": "",
  "profile": false,
  "watch": true,
  "log_level": "info"
}
```

## Description

|       FIELD      |               DESCRIPTION                 |         EXAMPLE         |
|:-----------------|:------------------------------------------|:------------------------|
| *host            | local ip address or domain name           | "localhost"             |
| *port            | local port to bind                        | 1024-65535              |
| servers          | a list of blinksocks server               | -                       |
| *key             | for encryption and decryption             | -                       |
| frame            | frame preset                              | "origin"                |
| frame_params     | parameters for frame preset               | ""                      |
| crypto           | crypto preset                             | ""                      |
| crypto_params    | parameters for crypto preset              | ""                      |
| protocol         | protocol preset                           | "ss-aead"               |
| protocol_params  | parameters for protocol preset            | "aes-256-gcm,ss-subkey" |
| obfs             | obfs preset                               | ""                      |
| obfs_params      | parameters for obfs preset                | ""                      |
| profile          | whether profile or not                    | false                   |
| watch            | watch --config for changes                | true                    |
| log_level        | log level                                 | "info"                  |

> NOTE: `host`, `port`, and `key` must be set.

* Servers

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

Also see [Multi-Server mode](../development/architecture#multi-server-mode).

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
    ├── aead2.js
    ├── aead.js
    ├── none.js
    └── ss-aead.js
```

Please check out relevant [presets](src/presets), they are documented well.

* Log Levels

The logging library [winston](https://github.com/winstonjs/winston) use
npm logging levels by default, you can choose one of them demand:

```
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
```

## Work with shadowsocks

To work with **shadowsocks**, please choose one of the following configuration:

**Steam Ciphers(Old Versions)**

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
  "protocol": "ss-aead",                      // must be "ss-aead"
  "protocol_params": "aes-256-gcm,ss-subkey", // method of shadowsocks
  "obfs": "",                                 // must be ""
  "obfs_params": ""
  ...
}
```

Please also check out [#27](https://github.com/blinksocks/blinksocks/issues/27) for ciphers we've
already implemented.
