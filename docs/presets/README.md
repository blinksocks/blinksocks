# Presets

Presets are chaining and composable, built-in presets are listed here.
If you want custom a preset, feel free to read [this](../development/architecture#Preset) first.

## [ss-base](../../src/presets/ss-base.js)

This is a very basic preset which delivers the real destination address from
blinksocks client to blinksocks server, and **MUST BE** the first one in the presets list.

## [ss-stream-cipher](../../src/presets/ss-stream-cipher.js)

The shadowsocks's [stream cipher](https://shadowsocks.org/en/spec/Stream-Ciphers.html).

| PARAMS    | DESCRIPTION                      |
| :-------- | :------------------------------- |
| method    | encryption and decryption method |

`method` can be one of:

aes-128-ctr, aes-192-ctr, aes-256-ctr,

aes-128-cfb, aes-192-cfb, aes-256-cfb,

aes-128-ofb, aes-192-ofb, aes-256-ofb,

aes-128-cbc, aes-192-cbc, aes-256-cbc

camellia-128-cfb, camellia-192-cfb, camellia-256-cfb

## [ss-aead-cipher](../../src/presets/ss-aead-cipher.js)

The shadowsocks's [aead cipher](https://shadowsocks.org/en/spec/AEAD-Ciphers.html).

| PARAMS    | DESCRIPTION                      |
| :-------- | :------------------------------- |
| method    | encryption and decryption method |
| info      | a string to generate subkey      |

`method` can be one of:

aes-128-gcm, aes-192-gcm, aes-256-gcm

If you want to work with shadowsocks client/server, the `info` must be **"ss-subkey"** without quotes.
Otherwise, it can be any string.

## [obfs-http](../../src/presets/obfs-http.js)

A http obfuscator, the first round after TCP handshake will wrap data within a random http header
selected from a text file.

| PARAMS    | DESCRIPTION                                   |
| :-------- | :-------------------------------------------- |
| file      | a text file which contains HTTP header paris. |

`file` for example:

```
======================
GET / HTTP/1.1
Host: bing.com
Accept: */*
----------------------
HTTP/1.1 200 OK
Content-Type: text/plain
======================
POST /login HTTP/1.1
Host: login.live.com
Content-type: application/json
----------------------
HTTP/1.1 200 OK
======================
```

## [obfs-tls1.2-ticket](../../src/presets/obfs-tls1.2-ticket.js)

A TLS obfuscator, do TLS handshake using SessionTicket TLS mechanism, transfer data inside of Application Data.

| PARAMS    | DESCRIPTION                                                                    |
| :-------- | :----------------------------------------------------------------------------- |
| sni       | [Server Name Indication](https://en.wikipedia.org/wiki/Server_Name_Indication) |

# Recommended Combinations

## Work with shadowsocks

To work with **shadowsocks**, please choose one of the following configuration:

**Steam Ciphers(Older Versions)**

```json
"presets": [{
  "name": "ss-base",
  "params": {}
}, {
  "name": "ss-stream-cipher",
  "params": {
    "method": "aes-256-cfb"
  }
}]
```

**AEAD Ciphers(Newer Versions)**

```json
"presets": [{
  "name": "ss-base",
  "params": {}
}, {
  "name": "ss-aead-cipher",
  "params": {
    "method": "aes-256-gcm",
    "info": "ss-subkey"
  }
}]
```

Please also check out [#27](https://github.com/blinksocks/blinksocks/issues/27) for ciphers we've already implemented.

## Avoid QoS

You can use **http** or **tls** obfuscator to avoid bad [QoS](https://en.wikipedia.org/wiki/Quality_of_service), **tls** is recommended.

```json
"presets": [{
  "name": "ss-base",
  "params": {}
}, {
  "name": "ss-aead-cipher",
  "params": {
    "method": "aes-256-gcm",
    "info": "ss-subkey"
  }
}, {
  "name": "obfs-http",
  "params": {
    "file": "http-fake.txt"
  }
}]
```

```json
"presets": [{
  "name": "ss-base",
  "params": {}
}, {
  "name": "ss-aead-cipher",
  "params": {
    "method": "aes-256-gcm",
    "info": "ss-subkey"
  }
}, {
  "name": "obfs-tls1.2-ticket",
  "params": {
    "sni": "www.bing.com"
  }
}]
```
