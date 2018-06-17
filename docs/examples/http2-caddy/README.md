# http2-caddy

**Minimal Version Required: v3.3.2**

blinksocks can transfer data through [caddy] proxy server using http2:

```
                                      +--------------------------------------------------+
                                      | Caddy Server                                     |
+-------------+                       |                                   +-----------+  |          +------------+
|             |  h2://site.com/path   |    :433       h2://127.0.0.1:1234 |           |  |  tcp://  |            |
|  bs-client  <----------------------->  proxy /path +--------------------> bs-server <------------->   Target   |
|             |     (encrypted)       |                   (encrypted)     |           |  |  (raw)   |            |
+-------------+                       |                                   +-----------+  |          +------------+
                                      |                                                  |
                                      +--------------------------------------------------+
```

When use `h2://` as transport on **server side**, make sure both `tls_cert` and `tls_key` is provided:

```
{
  ...
  "tls_key": "key.pem",
  "tls_cert": "cert.pem"
  ...
}
```

**self-signed** tls_cert is ok because we set `insecure_skip_verify` in Caddyfile.

## Generate key.pem and cert.pem

```
// self-signed certificate
$ openssl req -x509 -newkey rsa:4096 -nodes -sha256 -subj '/CN=example.com' \
    -keyout key.pem -out cert.pem
```

[caddy]: https://caddyserver.com
