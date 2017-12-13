# Recommended Combinations

## Work with shadowsocks

To work with **shadowsocks**, please choose one of the following configurations:

**Steam Ciphers(Older Versions)**

```
"presets": [
  {"name": "ss-base"},
  {"name": "ss-stream-cipher", "params": {"method": "aes-256-cfb"}}
]
```

**AEAD Ciphers(Newer Versions)**

```
"presets": [
  {"name": "ss-base"},
  {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}}
]
```

## Work with shadowsocksR

> NOTE: To work with shadowsocksR, you must add both "ss-base" and "ss-stream-cipher".

<details>
  <summary>Notice in shadowsocksR config</summary>

  ```
  {
    ...
    "method": "aes-128-ctr",
    "protocol": "auth_aes128_md5",
    "protocol_param": "", // protocol_param must be empty
    "obfs": "plain", // obfs must be "plain"
    "obfs_param": "",
    ...
  }
  ```

</details>

**auth_aes128_md5 / auth_aes128_sha1**

```
"presets": [
  {"name": "ss-base"},
  {"name": "ssr-auth-aes128-md5"},
  {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
]
```

**auth_chain_a / auth_chain_b**

```
"presets": [
  {"name": "ss-base"},
  {"name": "ssr-auth-chain-a"},
  {"name": "ss-stream-cipher", "params": {"method": "none"}}
]
```

## Work with v2ray vmess

> Notice in v2ray configs:

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

## Avoid Bad QoS

You can use **http** or **tls** obfuscator to avoid bad [QoS], **tls** is recommended.

```
"presets": [
  {"name": "ss-base"},
  {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}},
  {"name": "obfs-tls1.2-ticket", "params": {"sni": ["example.com"]}}
]
```

## To prevent traffic analysis

```
"presets": [
  {"name": "ss-base"},
  {"name": "obfs-random-padding"},
  {"name": "ss-stream-cipher","params": {"method": "aes-128-ctr"}}
]
```

## To prevent traffic analysis and ensure integrity as well

```
"presets": [
  {"name": "ss-base"},
  {"name": "obfs-random-padding"},
  {"name": "ss-aead-cipher","params": {"method": "aes-128-gcm"}}
]
```

> You can also check out [benchmark] to choose a combination you prefer.

[QoS]: https://en.wikipedia.org/wiki/Quality_of_service
[benchmark]: ../benchmark/README.md
