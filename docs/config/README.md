# Config.json

To start a server or client, you can prepare a configuration json file(`config.json` for example)
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
  "log_level": "info"
}
```

## Description

|       FIELD      |               DESCRIPTION                 |        DEFAULT       |
|:-----------------|:------------------------------------------|:---------------------|
| *host            | local ip address or domain name           | "localhost"          |
| *port            | local port to bind                        | 1080                 |
| servers          | a list of blinksocks server               | -                    |
| *key             | for encryption and decryption             | -                    |
| frame            | frame preset                              | "origin"             |
| frame_params     | parameters for frame preset               | ""                   |
| crypto           | crypto preset                             | "none"               |
| crypto_params    | parameters for crypto preset              | "aes-256-cfb"        |
| protocol         | protocol preset                           | "aead"               |
| protocol_params  | parameters for protocol preset            | "aes-256-cbc,sha256" |
| obfs             | obfs preset                               | "none"               |
| obfs_params      | parameters for obfs preset                | ""                   |
| log_level        | log level                                 | "error"              |

> NOTE: `host`, `port`, and `key` must be set.

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
    ├── aead2.js
    ├── basic.js
    └── none.js
```

Please check out relevant [presets](src/presets), they are documented well.

* Log Levels

The logging library [winston](https://github.com/winstonjs/winston) use
npm logging levels by default, you can choose one of them demand:

```
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
```

## Work with shadowsocks

To work with **shadowsocks** [stream ciphers](https://shadowsocks.org/en/spec/Stream-Ciphers.html),
please make sure you are using **"openssl"** `crypto` and have set `protocol` to **"none"**:

```
{
  ...
  "crypto": "openssl",
  "crypto_params": "aes-256-cfb", // shadowsocks's method
  "protocol": "none"
  ...
}
```

That's all you need to concern!
