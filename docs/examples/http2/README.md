# http2

**Minimal Version Required: v3.3.2**

blinksocks can transfer data using `http2`:

```
+-------------+                      +-------------+           +------------+
|             |  h2://site.com/path  |             |   tcp://  |            |
|  bs-client  <---------------------->  bs-server  <----------->   Target   |
|             |                      |             |           |            |
+-------------+                      +-------------+           +------------+
```

When use `h2://` as transport, make sure both `tls_cert` and `tls_key` is provided to `bs-server`.

> If your are using self-signed certificate on server, please also provide the same `tls_cert` on client and also set `"tls_cert_self_signed": true`.

Make sure you provide **Common Name** of certificate NOT IP in client config:

```
{
  ...
  "server": {
    "service": "h2://<Common Name>:<port>",
    "tls_cert": "cert.pem",
    "tls_cert_self_signed": true
    ...
  },
  ...
}
```
