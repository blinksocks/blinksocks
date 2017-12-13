# Suites (Dynamic Protocol Stack)

Like TLS cipher suite negotiation, blinksocks uses [auto-conf] to dynamic switch protocol stack once connection established.

Here I prepared a set of suites file, feel free to add/delete/modify them to meet your own needs.

```
"presets": [
  {
    "name": "auto-conf",
    "params": {
      "suites": "suites-x.json"
    }
  }
]
```

You can also load from remote use `http` or `https`:

```
"suites": "https://raw.githubusercontent.com/blinksocks/blinksocks/master/suites/suites-0.json"
```

> Note that client and server should pre-share exactly the same **suites.json**.

## [suites-0.json]

Enhanced shadowsocks and original shadowsocksr protocols.

## [suites-1.json]

High-performance protocols for [TLS] transport.

## Update Caveats

Please pay attention to the updates of suites you use. Any changes to the json file requires **synchronization** and **restart** on both client and server.

[auto-conf]: ../docs/presets#auto-conf
[TLS]: ../docs/config#blinksocks-over-tls
[suites-0.json]: ./suites-0.json
[suites-1.json]: ./suites-1.json