# Presets

Presets are chaining and composable, built-in presets are listed here.
If you want custom a preset, feel free to read [this](../development/architecture#preset) first.

## NOTICE

> You **MUST** put [ss-base] or [exp-base-with-padding] or [exp-base-auth-stream] to the first in presets list if you
want to relay data to blinksocks server.

## [ss-base]

This is a very basic preset which delivers the real destination address from blinksocks client to blinksocks server.

```json
"presets": [{
  "name": "ss-base",
  "params": {}
}]
```

## [exp-base-with-padding]

An experimental and advanced preset based on [ss-base], **SHOULD BE** used with ciphers in **cfb** operation mode.
It can prevent address from being tampered.

**NOTE**: Using [exp-base-with-padding] with non-cfb ciphers will lose protection. 

| PARAMS    | DESCRIPTION                     |
| :-------- | :------------------------------ |
| salt      | a string for generating padding |

```json
"presets": [{
  "name": "exp-base-with-padding",
  "params": {
    "salt": "any string"
  }
}, {
  "name": "ss-stream-cipher",
  "params": {
    "method": "aes-256-cfb"
  }
}]
```

## [exp-base-auth-stream]

An experimental preset combines HMAC and stream encryption. HMAC only guarantees integrity for addressing part.

| PARAMS    | DESCRIPTION                      |
| :-------- | :------------------------------- |
| method    | encryption and decryption method |

`method` can be one of:

aes-128-ctr, aes-192-ctr, aes-256-ctr,

aes-128-cfb, aes-192-cfb, aes-256-cfb,

camellia-128-cfb, camellia-192-cfb, camellia-256-cfb

```json
"presets": [{
  "name": "exp-base-auth-stream",
  "params": {
    "method": "aes-256-cfb"
  }
}]
```

## [ss-stream-cipher]

The shadowsocks's [stream cipher](https://shadowsocks.org/en/spec/Stream-Ciphers.html).

| PARAMS    | DESCRIPTION                      |
| :-------- | :------------------------------- |
| method    | encryption and decryption method |

`method` can be one of:

aes-128-ctr, aes-192-ctr, aes-256-ctr,

aes-128-cfb, aes-192-cfb, aes-256-cfb,

camellia-128-cfb, camellia-192-cfb, camellia-256-cfb

```json
"presets": [
  ...,
  {
    "name": "ss-stream-cipher",
    "params": {
      "method": "camellia-256-cfb"
    }
  }
]
```

## [ss-aead-cipher]

The shadowsocks's [aead cipher](https://shadowsocks.org/en/spec/AEAD-Ciphers.html).

| PARAMS    | DESCRIPTION                      |
| :-------- | :------------------------------- |
| method    | encryption and decryption method |
| info      | a string to generate subkey      |

`method` can be one of:

aes-128-gcm, aes-192-gcm, aes-256-gcm

If you want to work with shadowsocks client/server, the `info` must be **"ss-subkey"** without quotes.
Otherwise, it can be any string.

```json
"presets": [
  ...,
  {
    "name": "ss-aead-cipher",
    "params": {
      "method": "aes-256-gcm",
      "info": "ss-subkey"
    }
  }
]
```

## [aead-random-cipher]

This preset is based on **ss-aead-cipher**, but added random padding in the front of **each chunk**. This preset inherited
all features from **ss-aead-cipher** and prevent server from being detected by packet length statistics analysis.

| PARAMS           | DESCRIPTION                              |
| :--------------- | :--------------------------------------- |
| method           | encryption and decryption method         |
| info             | a string to generate subkey              |
| factor(optional) | random padding length = (0-255) * factor |

```json
"presets": [
  ...,
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

## [obfs-http]

A http obfuscator, the first round after TCP handshake will wrap data within a random http header
selected from a text file.

| PARAMS    | DESCRIPTION                                   |
| :-------- | :-------------------------------------------- |
| file      | a text file which contains HTTP header paris. |

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

```json
"presets": [
  ...,
  {
    "name": "obfs-http",
    "params": {
      "file": "path/to/fake.txt"
    }
  }
]
```

## [obfs-tls1.2-ticket]

A TLS obfuscator, do TLS handshake using SessionTicket TLS mechanism, transfer data inside of Application Data.

| PARAMS    | DESCRIPTION                                                      |
| :-------- | :--------------------------------------------------------------- |
| sni       | [Server Name Indication], a server name or a list of server name |

```json
"presets": [
  ...,
  {
    "name": "obfs-tls1.2-ticket",
    "params": {
      "sni": ["cloudfront.net"]
    }
  }
]
```

# Special Presets

## [proxy]

This preset turns blinksocks to a proxy server. This is useful to setup a network middleware(act as Man-in-the-middle) to do traffic analysis.

For example, setup a local proxy server using **blinksocks server** at 1080:

> applications ---Socks5/HTTP---> **[blinksocks server]** ------> destinations

```js
// blinksocks.server.js
module.exports = {
  host: "localhost",
  port: 1080,
  presets: [
    {
      name: "proxy",
      params: {}
    }
  ],
  ...
};
```

# Recommended Combinations

## Work with shadowsocks

To work with **shadowsocks**, please choose one of the following configuration:

**Steam Ciphers(Older Versions)**

```json
"presets": [{
  "name": "ss-base",
  "params": {}
}, {
  "name": "ss-stream-cipher",
  "params": {
    "method": "aes-256-cfb"
  }
}]
```

**AEAD Ciphers(Newer Versions)**

```json
"presets": [{
  "name": "ss-base",
  "params": {}
}, {
  "name": "ss-aead-cipher",
  "params": {
    "method": "aes-256-gcm",
    "info": "ss-subkey"
  }
}]
```

Please also check out [#27](https://github.com/blinksocks/blinksocks/issues/27) for ciphers we've already implemented.

## Avoid QoS

You can use **http** or **tls** obfuscator to avoid bad [QoS], **tls** is recommended.

```json
"presets": [{
  "name": "ss-base",
  "params": {}
}, {
  "name": "ss-aead-cipher",
  "params": {
    "method": "aes-256-gcm",
    "info": "ss-subkey"
  }
}, {
  "name": "obfs-http",
  "params": {
    "file": "http-fake.txt"
  }
}]
```

```json
"presets": [{
  "name": "ss-base",
  "params": {}
}, {
  "name": "ss-aead-cipher",
  "params": {
    "method": "aes-256-gcm",
    "info": "ss-subkey"
  }
}, {
  "name": "obfs-tls1.2-ticket",
  "params": {
    "sni": ["www.bing.com"]
  }
}]
```

## Try other compositions

If you don't want to encrypt all your data, just remove **cipher** preset, the followings should work:

The fastest one:

```json
"presets": [{
  "name": "ss-base",
  "params": {}
}]
```

Make some cheat:

```json
"presets": [{
  "name": "ss-base",
  "params": {}
}, {
  "name": "obfs-tls1.2-ticket",
  "params": {
    "sni": ["www.bing.com"]
  }
}]
```

[ss-base]: ../../src/presets/ss-base.js
[exp-base-with-padding]: ../../src/presets/exp-base-with-padding.js
[exp-base-auth-stream]: ../../src/presets/exp-base-auth-stream.js
[ss-stream-cipher]: ../../src/presets/ss-stream-cipher.js
[ss-aead-cipher]: ../../src/presets/ss-aead-cipher.js
[aead-random-cipher]: ../../src/presets/aead-random-cipher.js
[obfs-http]: ../../src/presets/obfs-http.js
[obfs-tls1.2-ticket]: ../../src/presets/obfs-tls1.2-ticket.js
[proxy]: ../../src/presets/proxy.js
[Server Name Indication]: https://en.wikipedia.org/wiki/Server_Name_Indication
[QoS]: https://en.wikipedia.org/wiki/Quality_of_service
