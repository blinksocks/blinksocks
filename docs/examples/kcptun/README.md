# kcptun

**Minimal Version Required: v2.x**

It would be nice if we can transfer data stream via UDP, a good news is blinksocks can use [kcptun] as transport layer:

```
                  +-------------------------------------------+           +-------------------------------------------+
                  |              Local Machine                |           |                example.com                |
                  |                                           |           |                                           |
                  |  +-------------+       +---------------+  |           |  +---------------+       +-------------+  |
                  |  |             |  tcp  |               |  |    udp    |  |               |  tcp  |             |  |
Applications <------->  bs-client  <-------> kcptun-client <-----------------> kcptun-server <------->  bs-server  <--------> Targets
                  |  |             |       |               |  |           |  |               |       |             |  |
                  |  +-------------+       +---------------+  |           |  +---------------+       +-------------+  |
                  |       :1080                 :12948        |           |       :29900                  :30370      |
                  |                                           |           |                                           |
                  +-------------------------------------------+           +-------------------------------------------+
```

> Please notice that `tcp` is required by blinksocks when communicate with kcptun.

`blinksocks` will encrypt data stream so you can turn off **encryption** of kcptun by setting:

```
  "crypt": "none"
```

We recommend you to turn off **compression** as well to improve performance of data processing, because only **plain text** can be compressed well:

```
  "nocomp": true
```

## Start kcptun

```
$ kcptun -c kcptun.client.json
$ kcptun -c kcptun.server.json
```

[kcptun]: https://github.com/xtaci/kcptun
