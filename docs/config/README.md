## Config.json

To start a server or client, you can prepare a configuration json file(`config.json` for example) then supply to `--config` or `-c`.

```json
{
  "host": "localhost",
  "port": 6666,
  "servers": [
    "node1.test.com:7777",
    "node2.test.com:7777"
  ],
  "key": "secret",
  "frame": "origin",
  "frame_params": "",
  "crypto": "openssl",
  "crypto_params": "aes-128-ofb",
  "protocol": "aead",
  "protocol_params": "aes-256-cbc,sha256",
  "obfs": "http",
  "obfs_params": "http-fake.txt",
  "log_level": "error"
}
```

|       FIELD      |               DESCRIPTION                 |        DEFAULT       |
|:-----------------|:------------------------------------------|:---------------------|
| *host            | local ip address or domain name           | "localhost"          |
| *port            | local port to bind                        | 1080                 |
| servers          | a list of blinksocks server               | -                    |
| *key             | for encryption and decryption             | -                    |
| frame            | frame preset                              | "origin"             |
| frame_params     | parameters for frame preset               | ""                   |
| crypto           | crypto preset                             | ""                   |
| crypto_params    | parameters for crypto preset              | "aes-256-cfb"        |
| protocol         | protocol preset                           | "aead"               |
| protocol_params  | parameters for protocol preset            | "aes-256-cbc,sha256" |
| obfs             | obfs preset                               | "none"               |
| obfs_params      | parameters for obfs preset                | ""                   |
| log_level        | log level                                 | "error"              |

> NOTE: `host`, `port`, and `key` must be set.

* Presets, Ciphers and Hashes

Please check out relevant [presets](src/presets), they are documented well.

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

* Log Levels

The logging library [winston](https://github.com/winstonjs/winston) use
npm logging levels by default, you can choose one of them demand:

```
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
```
