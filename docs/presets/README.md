# Presets

Presets are chaining and composable, built-in presets are listed here.

**basic**

* [base-auth](#base-auth)*

**shadowsocks**

* [ss-base](#ss-base)*
* [ss-stream-cipher](#ss-stream-cipher)
* [ss-aead-cipher](#ss-aead-cipher)

**shadowsocksR**

* [ssr-auth-aes128-md5](#ssr-auth-aes128-md5)
* [ssr-auth-aes128-sha1](#ssr-auth-aes128-sha1)
* [ssr-auth-chain-a](#ssr-auth-chain-a)
* [ssr-auth-chain-b](#ssr-auth-chain-b)

**v2ray**

* [v2ray-vmess](#v2ray-vmess)*

**obfuscator**

* [obfs-random-padding](#obfs-random-padding)
* [obfs-http](#obfs-http)
* [obfs-tls1.2-ticket](#obfs-tls1.2-ticket)

**others**

* [auto-conf](#auto-conf)*
* [aead-random-cipher](#aead-random-cipher)

> You **MUST** provide one and only one preset signed with (*) to the presets list if you want to relay application data to dynamic destinations.

## Import External Preset

If you have installed blinksocks by **npm install -g blinksocks**, you are free to use external presets:

**Use public npm package:**

```
$ npm install -g blinksocks-preset-demo
```

```
"presets": [{"name": "blinksocks-preset-demo"}]
```

**Use private package:**

```
"presets": [{"name": "/path/to/your/preset.js"}]
```

> When use external preset, make sure that preset meets the requirements of the current Node.js environment.

To customize your own preset, please refer to [Custom Preset](../development/custom-preset).

----

## [base-auth]

A preset based on "ss-base" and provides a HMAC to ensure integrity for addressing part.

| PARAMS |            DESCRIPTION             | DEFAULT |
| :----- | :--------------------------------- | :------ |
| method | a hash algorithm for creating HMAC | sha1    |

`method` can be one of:

md5, sha1, sha256

```
"presets": [{
  "name": "base-auth",
  "params": {
    "method": "sha1"
  }
}, {
  "name": "ss-stream-cipher",
  "params": {
    "method": "aes-256-cfb"
  }
}]
```

## [ss-base]

This is a very basic preset which delivers the real destination address from client to server.

```
"presets": [
  {"name": "ss-base"}
]
```

## [ss-stream-cipher]

The shadowsocks's [stream cipher](https://shadowsocks.org/en/spec/Stream-Ciphers.html).

| PARAMS |           DESCRIPTION            | DEFAULT |
| :----- | :------------------------------- | :------ |
| method | encryption and decryption method | -       |

`method` can be one of:

aes-128-ctr, aes-192-ctr, aes-256-ctr,

aes-128-cfb, aes-192-cfb, aes-256-cfb,

camellia-128-cfb, camellia-192-cfb, camellia-256-cfb

rc4-md5, rc4-md5-6, none

```
"presets": [
  {
    "name": "ss-base"
  },
  {
    "name": "ss-stream-cipher",
    "params": {
      "method": "aes-256-ctr"
    }
  }
]
```

## [ss-aead-cipher]

The shadowsocks's [aead cipher](https://shadowsocks.org/en/spec/AEAD-Ciphers.html).

| PARAMS |           DESCRIPTION            | DEFAULT |
| :----- | :------------------------------- | :------ |
| method | encryption and decryption method | -       |

`method` can be one of:

aes-128-gcm, aes-192-gcm, aes-256-gcm,

chacha20-poly1305, chacha20-ietf-poly1305, xchacha20-ietf-poly1305

```
"presets": [
  {
    "name": "ss-base"
  },
  {
    "name": "ss-aead-cipher",
    "params": {
      "method": "aes-256-gcm"
    }
  }
]
```

## [ssr-auth-aes128-md5]
## [ssr-auth-aes128-sha1]

shadowsocksr [auth_aes128](https://github.com/shadowsocksr-rm/shadowsocks-rss/blob/master/doc/auth_aes128.md) implementation.

```
"presets": [
  {"name": "ss-base"},
  {"name": "ssr-auth-aes128-md5"},
  {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
]
```

## [ssr-auth-chain-a]
## [ssr-auth-chain-b]

shadowsocksr [auth_chain](https://github.com/shadowsocksr-rm/shadowsocks-rss/blob/master/doc/auth_chain_a.md) implementation.

```
"presets": [
  {"name": "ss-base"},
  {"name": "ssr-auth-chain-a"},
  {"name": "ss-stream-cipher", "params": {"method": "none"}}
]
```

## [v2ray-vmess]

[v2ray vmess protocol](https://www.v2ray.com/chapter_04/03_vmess.html) implementation.

|  PARAMS  |            DESCRIPTION             |   DEFAULT   |
| :------- | :--------------------------------- | :---------- |
| id       | client uuid                        | -           |
| security | encryption method, **client only** | aes-128-gcm |

`method` can be one of:

aes-128-gcm, chacha20-poly1305, none

```
"presets": [
  {
    "name": "v2ray-vmess",
    "params": {
      "id": "c2485913-4e9e-41eb-8cc5-b2e7db8d3bc7",
      "security": "aes-128-gcm"
    }
  }
]
```

## [obfs-random-padding]

A simple obfuscator to significantly randomize the length of each packet. It can be used to prevent statistical analysis based on packet length.

```
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
      "method": "aes-256-ctr"
    }
  }
]
```

## [obfs-http]

A http obfuscator, the first request will wrap a http header randomly selected from a text file.

| PARAMS |                  DESCRIPTION                  | DEFAULT |
| :----- | :-------------------------------------------- | :------ |
| file   | a text file which contains HTTP header paris. | -       |

`file` for example:

```
======================
GET / HTTP/1.1
Host: bing.com
Accept: */*
----------------------
HTTP/1.1 200 OK
Content-Type: text/plain
======================
POST /login HTTP/1.1
Host: login.live.com
Content-type: application/json
----------------------
HTTP/1.1 200 OK
======================
```

```
"presets": [
  {
    "name": "ss-base"
  },
  {
    "name": "obfs-http",
    "params": {
      "file": "path/to/fake.txt"
    }
  }
]
```

## [obfs-tls1.2-ticket]

A TLS1.2 obfuscator, do TLS handshake using SessionTicket TLS mechanism, transfer data inside of Application Data.

| PARAMS |                           DESCRIPTION                            | DEFAULT |
| :----- | :--------------------------------------------------------------- | :------ |
| sni    | [Server Name Indication], a server name or a list of server name | -       |

```
"presets": [
  {
    "name": "ss-base"
  },
  {
    "name": "obfs-tls1.2-ticket",
    "params": {
      "sni": ["cloudfront.net"]
    }
  }
]
```

## [auto-conf]

An **experimental** preset used for auto-configure preset list. It will randomly choose a suite from `suites` for each connection.

| PARAMS |                    DESCRIPTION                    | DEFAULT |
| :----- | :------------------------------------------------ | :------ |
| suites | A json file includes a set of preset combinations | -       |

```
"presets": [
  {
    "name": "auto-conf",
    "params": {
      "suites": "suites.json"
    }
  }
]
```

> You can custom `suites.json` or just use one of the [official versions](../../suites).

## [aead-random-cipher]

This preset is based on **ss-aead-cipher**, but added random padding in the front of **each chunk**. This preset inherited
all features from **ss-aead-cipher** and prevent server from being detected by packet length statistics analysis.

|      PARAMS      |               DESCRIPTION                |   DEFAULT   |
| :--------------- | :--------------------------------------- | :---------- |
| method           | encryption and decryption method         | -           |
| info(optional)   | a string to generate subkey              | "bs-subkey" |
| factor(optional) | random padding length = (0-255) * factor | 2           |

```
"presets": [
  {
    "name": "base-with-padding",
    "params": {
      "salt": "any string"
    }
  },
  {
    "name": "aead-random-cipher",
    "params": {
      "method": "aes-256-gcm",
      "info": "bs-subkey",
      "factor": 2
    }
  }
]
```

## Have trouble in choosing presets?

Here is a [list](./RECOMMENDATIONS.md) of recommended conbinations.

[base-auth]: ../../src/presets/base-auth.js
[ss-base]: ../../src/presets/ss-base.js
[ss-stream-cipher]: ../../src/presets/ss-stream-cipher.js
[ss-aead-cipher]: ../../src/presets/ss-aead-cipher.js
[ssr-auth-aes128-md5]: ../../src/presets/ssr-auth-aes128-md5.js
[ssr-auth-aes128-sha1]: ../../src/presets/ssr-auth-aes128-sha1.js
[ssr-auth-chain-a]: ../../src/presets/ssr-auth-chain-a.js
[ssr-auth-chain-b]: ../../src/presets/ssr-auth-chain-b.js
[v2ray-vmess]: ../../src/presets/v2ray-vmess.js
[obfs-random-padding]: ../../src/presets/obfs-random-padding.js
[obfs-http]: ../../src/presets/obfs-http.js
[obfs-tls1.2-ticket]: ../../src/presets/obfs-tls1.2-ticket.js
[auto-conf]: ../../src/presets/auto-conf.js
[aead-random-cipher]: ../../src/presets/aead-random-cipher.js
[Server Name Indication]: https://en.wikipedia.org/wiki/Server_Name_Indication
