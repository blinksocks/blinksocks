# basic

**Minimal Version Required: v1.x**

```
                  +-------------+                     +-------------+
        socks://  |             |  tcp://example.com  |             |  tcp://
Apps <------------>  bs-client  <--------------------->  bs-server  <---------> targets
                  |             |                     |             |
                  +-------------+                     +-------------+
```

This is a very basic but common usage of blinksocks, you can first generate minimal configs by:

```
$ blinksocks init -m
```

Then start both client and server by:

```
$ blinksocks blinksocks.client.json
```

```
$ blinksocks blinksocks.server.json
```

Then test using curl:

```
$ curl -L --socks5-hostname localhost:1080 www.google.com
```
