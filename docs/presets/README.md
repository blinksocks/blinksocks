# Presets

Presets are chaining and composable, built-in presets are listed here. If you want to customize a new preset, feel free to read [this](../development/architecture#preset) first.

## Table of Contents

**functional**

* [proxy](#proxy)
* [tunnel](#tunnel)
* [stats](#stats)
* [tracker](#tracker)
* [access-control](#access-control)

**shadowsocks**

* [ss-base](#ss-base)*
* [ss-stream-cipher](#ss-stream-cipher)
* [ss-aead-cipher](#ss-aead-cipher)

**v2ray**

* [v2ray-vmess](#v2ray-vmess)*

**obfuscator**

* [obfs-random-padding](#obfs-random-padding)
* [obfs-http](#obfs-http)
* [obfs-tls1.2-ticket](#obfs-tls1.2-ticket)

**experimental**

* [exp-base-with-padding](#exp-base-with-padding)*
* [exp-base-auth-stream](#exp-base-auth-stream)*
* [exp-compress](#exp-compress)

**others**

* [aead-random-cipher](#aead-random-cipher)

### NOTICE

> You **MUST** put preset signed with * to the presets list(anywhere in theory) if you want to relay data.

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

|     PARAMS     |   DESCRIPTION    | DEFAULT |
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

|     PARAMS      |         DESCRIPTION          | DEFAULT |
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
    "from": 1503920985192,
    "to": 1503921026263,
    "duration": 41071
  },
  "summary": {
    "maxOutSpeed": 105254,
    "maxInSpeed": 158,
    "maxConnections": 2,
    "totalOutBytes": 130360,
    "totalOutPackets": 34,
    "totalInBytes": 314,
    "totalInPackets": 2,
    "totalBytes": 130674,
    "totalPackets": 36,
    "totalErrors": 0
  },
  "instant": {
    "outSpeed": 0,
    "inSpeed": 0,
    "totalConnections": 0,
    "errorRate": 0,
    "outBytesPerSecond": 3174.0157288597798,
    "outPacketsPerSecond": 0.8278347252319155,
    "inBytesPerSecond": 7.645297168318279,
    "inPacketsPerSecond": 0.04869616030775974,
    "totalBytesPerSecond": 3181.6610260280977,
    "totalPacketsPerSecond": 0.8765308855396753
  },
  "process": {
    "upTime": 42.067,
    "cpuUsage": {
      "user": 1219598,
      "system": 96237
    },
    "memoryUsage": {
      "rss": 54575104,
      "heapTotal": 28311552,
      "heapUsed": 21701240,
      "external": 3688374
    }
  }
}
```

## [tracker]

Track data send/receive events via this preset, and print a part of them after connection closed.

```
"presets": [
  ...
  {"name": "tracker"},
  ...
]
```

And you can get the track message in your terminal and log files:

```
[tracker] summary(out/in = 14/9, 5191b/3431b) abstract(127.0.0.1:55566 play.google.com:443 u 555 d 394 u 616 d 165 u 221 156 934 795 d 74 u 43 d 1201 u 51 174 531 d 51 573 u 51 172 841 d 51 854 u 51 d 68)
```

## [access-control]

Easy and powerful Access Control(ACL) to each connection.

> NOTE: This preset is for server use only.

|  PARAMS   |                          DESCRIPTION                          | DEFAULT |
| :-------- | :------------------------------------------------------------ | :------ |
| acl       | A path to a text file which contains a list of rules in order | -       |
| max_tries | The maximum tries from client                                 | 60      |

> NOTE: you'd better put this preset to the last of the preset list.

```
"presets": [
  ...,
  {
    "name": "access-control",
    "params": {
      "acl": "acl.txt",
      "max_tries": 60
    }
  }
]
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

If server fail to process client(**by host**) requests over **max_tries** times, client will be **baned immediately**, and a new rule will be appended to the **acl** file.

To recovery unwary ban, you can edit acl file, remove unwanted rule without restarting the program.

> NOTE: rules will take effect immediately each time **acl.txt** was updated.

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

aes-128-gcm, aes-192-gcm, aes-256-gcm

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

## [v2ray-vmess]

[v2ray vmess protocol](https://www.v2ray.com/chapter_04/03_vmess.html) implementation.

|  PARAMS  |            DESCRIPTION             |   DEFAULT   |
| :------- | :--------------------------------- | :---------- |
| id       | client uuid                        | -           |
| security | encryption method, **client only** | aes-128-gcm |

`method` can be one of:

aes-128-gcm, none

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

**Notice in v2ray configs:**

<details>
  <summary>v2ray client</summary>

  ```
    "outbound": {
      "protocol": "vmess",
      "settings": {
        "vnext": [
          {
            "address": "127.0.0.1",
            "port": 10086,
            "users": [
              {
                "id": "c2485913-4e9e-41eb-8cc5-b2e7db8d3bc7",
                "security": "aes-128-gcm",
                "alterId": 0 // [must be the default value: 0]
              }
            ]
          }
        ]
      },
      "mux": {
        "enabled": false // [must be false]
      }
    },
  ```

</details>

<details>
  <summary>v2ray server</summary>

```
  "inbound": {
    "port": 10086,
    "protocol": "vmess",
    "settings": {
      "clients": [
        {
          "id": "c2485913-4e9e-41eb-8cc5-b2e7db8d3bc7",
          "level": 1,
          "alterId": 0 // [must be the default value: 0]
        }
      ]
    }
  },
```

</details>

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

A http obfuscator, the first round after TCP handshake will wrap data within a random http header
selected from a text file.

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

## [exp-base-with-padding]

An **experimental** and advanced preset based on [ss-base], **SHOULD BE** used with ciphers in **cfb** operation mode.
It can prevent address from being tampered.

**NOTE**: Using [exp-base-with-padding] with non-cfb ciphers will lose protection. 

| PARAMS |           DESCRIPTION           | DEFAULT |
| :----- | :------------------------------ | :------ |
| salt   | a string for generating padding | -       |

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

| PARAMS |           DESCRIPTION            | DEFAULT |
| :----- | :------------------------------- | :------ |
| method | encryption and decryption method | -       |

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

## [exp-compress]

An **experimental** to do stream compression/decompression. **Use with caution.**

| PARAMS |             DESCRIPTION              | DEFAULT |
| :----- | :----------------------------------- | :------ |
| method | compression and decompression method | -       |

`method` can be one of:

gzip, deflate

```
"presets": [
  {"name": "ss-base"},
  {"name": "exp-compress", "params": {"method": "deflate"}}
]
```

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
    "method": "aes-256-gcm"
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
    "method": "aes-256-gcm"
  }
}, {
  "name": "obfs-tls1.2-ticket",
  "params": {
    "sni": ["www.bing.com"]
  }
}]
```

## To prevent length analysis and ensure integrity as well

```
"presets": [
  {
    "name": "ss-base"
  },
  {
    "name": "obfs-random-padding"
  },
  {
    "name": "ss-aead-cipher",
    "params": {
      "method": "aes-128-gcm"
    }
  }
]
```

## Try other compositions

If you don't want to encrypt all your data, just remove **cipher** preset, the followings should work:

The fastest one:

```
"presets": [{"name": "ss-base"}]
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

> You can also check out [benchmark] to choose a combination you prefer.

[proxy]: ../../src/presets/proxy.js
[tunnel]: ../../src/presets/tunnel.js
[stats]: ../../src/presets/stats.js
[tracker]: ../../src/presets/tracker.js
[access-control]: ../../src/presets/access-control.js
[ss-base]: ../../src/presets/ss-base.js
[ss-stream-cipher]: ../../src/presets/ss-stream-cipher.js
[ss-aead-cipher]: ../../src/presets/ss-aead-cipher.js
[v2ray-vmess]: ../../src/presets/v2ray-vmess.js
[obfs-random-padding]: ../../src/presets/obfs-random-padding.js
[obfs-http]: ../../src/presets/obfs-http.js
[obfs-tls1.2-ticket]: ../../src/presets/obfs-tls1.2-ticket.js
[exp-compress]: ../../src/presets/exp-compress.js
[exp-base-with-padding]: ../../src/presets/exp-base-with-padding.js
[exp-base-auth-stream]: ../../src/presets/exp-base-auth-stream.js
[aead-random-cipher]: ../../src/presets/aead-random-cipher.js
[Server Name Indication]: https://en.wikipedia.org/wiki/Server_Name_Indication
[QoS]: https://en.wikipedia.org/wiki/Quality_of_service
[benchmark]: ../../docs/benchmark
