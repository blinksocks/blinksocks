# shadowsocksr

**Minimal Version Required: v2.x**

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
