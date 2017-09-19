# Recommended Combinations

## Work with shadowsocks

To work with **shadowsocks**, please choose one of the following configurations:

**Steam Ciphers(Older Versions)**

```json
"presets": [
  {"name": "ss-base"},
  {"name": "ss-stream-cipher", "params": {"method": "aes-256-cfb"}}
]
```

**AEAD Ciphers(Newer Versions)**

```json
"presets": [
  {"name": "ss-base"},
  {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}}
]
```

Please also check out [#27](https://github.com/blinksocks/blinksocks/issues/27) for ciphers we supported.

## Work with v2ray vmess

```json
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

## Best performance with only confidentiality

```json
"presets": [
  {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
  {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
]
```

## Best performance with confidentiality and partial integrity

```json
"presets": [
  {"name": "exp-base-auth-stream", "params": {"method": "aes-256-ctr"}}
]
```

## Avoid Bad QoS(using obfs)

You can use **http** or **tls** obfuscator to avoid bad [QoS], **tls** is recommended.

```json
"presets": [
  {"name": "ss-base"},
  {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}},
  {"name": "obfs-tls1.2-ticket", "params": {"sni": ["example.com"]}}
]
```

```json
"presets": [
  {"name": "exp-base-auth-stream", "params":{"method": "aes-256-ctr"}},
  {"name": "obfs-tls1.2-ticket", "params": {"sni": ["example.com"]}}
]
```

## To prevent statistical analysis and ensure integrity as well

```json
"presets": [
  {"name": "ss-base"},
  {"name": "obfs-random-padding"},
  {"name": "ss-aead-cipher","params": {"method": "aes-128-gcm"}}
]
```

> You can also check out [benchmark] to choose a combination you prefer.

[QoS]: https://en.wikipedia.org/wiki/Quality_of_service
[benchmark]: ../benchmark/README.md
