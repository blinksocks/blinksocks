# Presets

Presets are chaining and composable, built-in presets are listed here.
If you want custom a preset, feel free to read [this](../development/architecture#preset) first.

## NOTICE

> You **MUST** put [ss-base] or [exp-base-with-padding] or [exp-base-auth-stream] to the first in presets list if you
want to relay data to blinksocks server.

## [proxy]

This preset turns blinksocks to a proxy server, works on both client and server side.

* For client side, this preset is **added by default** on **client side**, so you don't have to put it into preset list if you are setting up a proxy service.
* For server side, this preset is useful to setup a network middleware(act as Man-in-the-middle) to do traffic analysis.

For example, setup a local proxy server using **blinksocks server** at 1080:

```
// blinksocks.server.json
{
  "host": "localhost",
  "port": 1080,
  "presets": [{
    "name": "proxy"
  }],
  ...
}
```

```
applications <---Socks/HTTP---> [blinksocks server] <------> destinations
```

```
$ blinksocks --config blinksocks.server.json
$ curl -L --socks5-hostname localhost:1080 https://www.bing.com
```

## [tunnel]

This proxy does not use any proxy protocols, just proxy original traffic to a permanent destination.

| PARAMS         | DESCRIPTION      | DEFAULT |
| :------------- | :--------------- | :------ |
| host(optional) | destination host | -       |
| port(optional) | destination port | -       |

```
// blinksocks.client.json
{
  "host": "localhost",
  "port": 1080,
  "servers": [{
    "enabled": true,
    "host": "localhost",
    "port": 1081,
    "presets": [{
      "name": "tunnel",
      "params": {
        "host": "localhost",
        "port": "1082"
      }
    }],
    ...
  }],
  ...
}
```

```
applications <----> [blinksocks client] <----> [blinksocks server] <----> localhost:1082
 (iperf -c)           localhost:1080             localhost:1081             (iperf -s)
```

In this case, it's useful to test network performance between client and server using [iperf](https://en.wikipedia.org/wiki/Iperf).

## [stats]

This preset perform statistics among traffic via this preset, you can put it anywhere in preset list to obtain **summary/instant/process** information of specific preset traffic. This preset has no side-effect to the traffic through it.

| PARAMS          | DESCRIPTION                  | DEFAULT |
| :-------------- | :--------------------------- | :------ |
| save_to         | path to the result json file | -       |
| sample_interval | sample interval in seconds   | 30      |
| save_interval   | save interval in seconds     | 60      |

```
"presets": [{
  "name": "ss-base"
}, {
  "name": "ss-stream-cipher",
  "params": {
    "method": "aes-256-cfb"
  }
}, {
  "name": "stats",
  "params": {
    "save_to": "stats.json",
    "sample_interval": 1,
    "save_interval": 10
  }
}]
```

```
// stats.json
{
  "sample": {
    "from": 1502344462515,
    "to": 1502344542664,
    "duration": 80149
  },
  "summary": {
    "totalErrors": 0,
    "totalOut": 1203,
    "totalIn": 128416,
    "totalOutPackets": 4,
    "totalInPackets": 23,
    "totalBytes": 129619,
    "totalPackets": 27,
    "maxOutSpeed": 1203,
    "maxInSpeed": 85962,
    "maxConnections": 2
  },
  "instant": {
    "outSpeed": 0,
    "inSpeed": 0,
    "errorRate": 0,
    "outBytesRate": 15.0095447229535,
    "outPacketsRate": 0.04990704812287115,
    "inBytesRate": 1602.2158729366554,
    "inPacketsRate": 0.2869655267065091,
    "totalBytesRate": 1617.2254176596089,
    "totalPacketsRate": 0.33687257482938027
  },
  "process": {
    "upTime": 80.932,
    "cpuUsage": {
      "user": 1080000,
      "system": 88000
    },
    "memoryUsage": {
      "rss": 65978368,
      "heapTotal": 33566720,
      "heapUsed": 28504720,
      "external": 298192
    }
  }
}
```

## [ss-base]

This is a very basic preset which delivers the real destination address from client to server.

```
"presets": [{
  "name": "ss-base"
}]
```

## [exp-base-with-padding]

An **experimental** and advanced preset based on [ss-base], **SHOULD BE** used with ciphers in **cfb** operation mode.
It can prevent address from being tampered.

**NOTE**: Using [exp-base-with-padding] with non-cfb ciphers will lose protection. 

| PARAMS    | DESCRIPTION                     | DEFAULT |
| :-------- | :------------------------------ | :------ |
| salt      | a string for generating padding | -       |

```
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

An **experimental** preset combines HMAC and stream encryption. HMAC only guarantees integrity for addressing part.

| PARAMS    | DESCRIPTION                      | DEFAULT |
| :-------- | :------------------------------- | :------ |
| method    | encryption and decryption method | -       |

`method` can be one of:

aes-128-ctr, aes-192-ctr, aes-256-ctr,

aes-128-cfb, aes-192-cfb, aes-256-cfb,

camellia-128-cfb, camellia-192-cfb, camellia-256-cfb

```
"presets": [{
  "name": "exp-base-auth-stream",
  "params": {
    "method": "aes-256-cfb"
  }
}]
```

## [ss-stream-cipher]

The shadowsocks's [stream cipher](https://shadowsocks.org/en/spec/Stream-Ciphers.html).

| PARAMS    | DESCRIPTION                      | DEFAULT |
| :-------- | :------------------------------- | :------ |
| method    | encryption and decryption method | -       |

`method` can be one of:

aes-128-ctr, aes-192-ctr, aes-256-ctr,

aes-128-cfb, aes-192-cfb, aes-256-cfb,

camellia-128-cfb, camellia-192-cfb, camellia-256-cfb

```
"presets": [
  {
    "name": "ss-base"
  },
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

| PARAMS    | DESCRIPTION                      | DEFAULT |
| :-------- | :------------------------------- | :------ |
| method    | encryption and decryption method | -       |
| info      | a string to generate subkey      | -       |

`method` can be one of:

aes-128-gcm, aes-192-gcm, aes-256-gcm

If you want to work with shadowsocks client/server, the `info` must be **"ss-subkey"** without quotes.
Otherwise, it can be any string.

```
"presets": [
  {
    "name": "ss-base"
  },
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

| PARAMS           | DESCRIPTION                              | DEFAULT |
| :--------------- | :--------------------------------------- | :------ |
| method           | encryption and decryption method         | -       |
| info             | a string to generate subkey              | -       |
| factor(optional) | random padding length = (0-255) * factor | 2       |

```
"presets": [
  {
    "name": "exp-base-with-padding",
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

## [obfs-http]

A http obfuscator, the first round after TCP handshake will wrap data within a random http header
selected from a text file.

| PARAMS    | DESCRIPTION                                   | DEFAULT |
| :-------- | :-------------------------------------------- | :------ |
| file      | a text file which contains HTTP header paris. | -       |

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

| PARAMS    | DESCRIPTION                                                      | DEFAULT |
| :-------- | :--------------------------------------------------------------- | :------ |
| sni       | [Server Name Indication], a server name or a list of server name | -       |

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

# Recommended Combinations

## Work with shadowsocks

To work with **shadowsocks**, please choose one of the following configuration:

**Steam Ciphers(Older Versions)**

```
"presets": [{
  "name": "ss-base"
}, {
  "name": "ss-stream-cipher",
  "params": {
    "method": "aes-256-cfb"
  }
}]
```

**AEAD Ciphers(Newer Versions)**

```
"presets": [{
  "name": "ss-base"
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

```
"presets": [{
  "name": "ss-base"
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

```
"presets": [{
  "name": "ss-base"
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

```
"presets": [{
  "name": "ss-base"
}]
```

Make some cheat:

```
"presets": [{
  "name": "ss-base"
}, {
  "name": "obfs-tls1.2-ticket",
  "params": {
    "sni": ["www.bing.com"]
  }
}]
```

> You can also see [benchmark] reports then choose a combination you want.

[proxy]: ../../src/presets/proxy.js
[tunnel]: ../../src/presets/tunnel.js
[stats]: ../../src/presets/stats.js
[ss-base]: ../../src/presets/ss-base.js
[exp-base-with-padding]: ../../src/presets/exp-base-with-padding.js
[exp-base-auth-stream]: ../../src/presets/exp-base-auth-stream.js
[ss-stream-cipher]: ../../src/presets/ss-stream-cipher.js
[ss-aead-cipher]: ../../src/presets/ss-aead-cipher.js
[aead-random-cipher]: ../../src/presets/aead-random-cipher.js
[obfs-http]: ../../src/presets/obfs-http.js
[obfs-tls1.2-ticket]: ../../src/presets/obfs-tls1.2-ticket.js
[Server Name Indication]: https://en.wikipedia.org/wiki/Server_Name_Indication
[QoS]: https://en.wikipedia.org/wiki/Quality_of_service
[benchmark]: ../../docs/benchmark
