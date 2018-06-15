# websocket-tls

**Minimal Version Required: v3.3.1**

blinksocks can transfer data using [WebSocket/TLS]:


```
+-------------+                       +-------------+           +------------+
|             |  wss://site.com/path  |             |   tcp://  |            |
|  bs-client  <----------------------->  bs-server  <----------->   Target   |
|             |      (encrypted)      |             |   (raw)   |            |
+-------------+                       +-------------+           +------------+
```

When use `wss://` as transport, make sure both `tls_cert` and `tls_key` is provided to `bs-server`.

> If your are using self-signed certificate on server, please also provide the same `tls_cert` on client and set `"tls_cert_self_signed": true`.

[WebSocket/TLS]: ../websocket-tls
