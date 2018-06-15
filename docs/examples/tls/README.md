# tls

**Minimal Version Required: v2.x**

blinksocks can transfer data using `tls`:

```
+-------------+                       +-------------+           +------------+
|             |  tls://site.com/path  |             |   tcp://  |            |
|  bs-client  <----------------------->  bs-server  <----------->   Target   |
|             |                       |             |           |            |
+-------------+                       +-------------+           +------------+
```

When use `tls://` as transport, make sure both `tls_cert` and `tls_key` is provided to `bs-server`.

> If your are using self-signed certificate on server, please also provide the same `tls_cert` on client and also set `"tls_cert_self_signed": true`.

Make sure you provide **Common Name** of certificate NOT IP in client config:

```
{
  ...
  "server": {
    "service": "tls://<Common Name>:<port>",
    "tls_cert": "cert.pem",
    "tls_cert_self_signed": true
    ...
  },
  ...
}
```

## Generate key.pem and cert.pem

```
// self-signed certificate
$ openssl req -x509 -newkey rsa:4096 -nodes -sha256 -subj '/CN=example.com' \
    -keyout key.pem -out cert.pem
```
