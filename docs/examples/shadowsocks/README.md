# shadowsocks

**Minimal Version Required: v1.x**

To work with **shadowsocks**, you can just add two presets:

**AEAD Ciphers(Newer Versions), Recommend**

```
"presets": [
  {"name": "ss-base"},
  {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}}
]
```

**Steam Ciphers(Older Versions)**

```
"presets": [
  {"name": "ss-base"},
  {"name": "ss-stream-cipher", "params": {"method": "aes-256-cfb"}}
]
```
