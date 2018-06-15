# websocket-caddy-tls

**Minimal Version Required: v3.3.1**

blinksocks can transfer data through [caddy] proxy server using [WebSocket/TLS]:

```
                                      +--------------------------------------------------+
                                      | Caddy Server                                     |
+-------------+                       |                                   +-----------+  |          +------------+
|             |  wss://site.com/path  |    :433       ws://127.0.0.1:1234 |           |  |  tcp://  |            |
|  bs-client  <----------------------->  proxy /path +--------------------> bs-server <------------->   Target   |
|             |     (encrypted)       |                   (encrypted)     |           |  |  (raw)   |            |
+-------------+                       |                                   +-----------+  |          +------------+
                                      |                                                  |
                                      +--------------------------------------------------+
```

[caddy]: https://caddyserver.com
[WebSocket/TLS]: ../websocket-tls
