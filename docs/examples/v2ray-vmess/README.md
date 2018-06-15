# v2ray-vmess

**Minimal Version Required: v2.x**

> NOTE: To work with v2ray vmess, you should only provide "v2ray-vmess" in preset list.

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
