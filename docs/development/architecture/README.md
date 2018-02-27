# Architecture

## Proxy Application Data

```
  +----------------+   HTTP/SOCKS    +---------------------+ 
  |  applications  |---------------->|  blinksocks client  |
  +----------------+                 +---------------------+ 
```

To take over data send and receive of applications, blinksocks implemented socks4(a)/socks5/HTTP protocols in [src/proxies](../../../src/proxies).

**References**

* [SOCKS4](http://www.openssh.com/txt/socks4.protocol)
* [SOCKS4a](http://www.openssh.com/txt/socks4a.protocol)
* [SOCKS5 RFC-1928](https://tools.ietf.org/rfc/rfc1928.txt)
* [HTTP/1.1 RFC-2616](https://tools.ietf.org/rfc/rfc2616.txt)

## Hub

```
  +----------+                           +-----------+
  |  Conn_1  |<---+                 +--->|  Relay_1  |
  +----------+    |    +-------+    |    +-----------+
  |   ...    |<---+--->|  Hub  |<---+--->|    ...    |
  +----------+    |    +-------+    |    +-----------+
  |  Conn_N  |<---+                 +--->|  Relay_N  |
  +----------+                           +-----------+
```

`Hub` gathers connections from apps or clients, for each connection, it also creates an associate relay.

## Relay

```
  +-----------------------------------------------+
  |                    Relay                      |
  |  +-----------+  +----------+                  |
---->|  Inbound  |->|   Pipe   |                  |  
  |  +-----------+  |----------|                  |  
  |                 |  Preset  |                  |  
  |                 |----------|                  |  
  |                 |  Preset  |                  |  
  |                 |----------|  +------------+  |  
  |                 |   ...    |->|  Outbound  |---->
  |                 +----------+  +------------+  |  
  +-----------------------------------------------+  
```

Relay handle both inbound and outbound endpoints, the type of inbound or outbound can be different. Once a relay created, it also creates an associate pipe.

## Inbound and Outbound

Inbound and Outbound are abstractions of transport layer, defined in [src/transports](../../../src/transports).

For example, when configure **blinksocks over websocket**, we create the following transport layer from client to server:

```
         +------------+  (websocket)  +-------------+
... ---->| WsOutbound |----> ... ---->|  WsInbound  |----> ...
         +------------+               +-------------+
```

## Pipe

Pipe is a director which handle a list of preset, transmit data from the previous preset to the next.

Similar to TCP/IP protocol stack, you can define your own protocol in each layer. Application data are processed **step by step** from the lowest layer to the top. Preset here act as specific layers in the stack.

Here is the original `shadowsocks` protocol implementation constructed by the following preset list:

```
{
  ...
  "presets": [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-cfb"}}
  ]
  ...
}
```

Pipe process application data from `ss-base` to `ss-stream-cipher`:

```
+--------+----------------------------------------+
|   IV   |            Encrypted PAYLOAD           |
+--------+----------------------------------------+ <-------+
|   16   |                Variable                |         |
+--------+----------------------------------------+         |
                                                            |
                              {"name": "ss-stream-cipher", "params": {"method": "aes-256-cfb"}}
                                                            |
         +------+----------+----------+-----------+         |
         | ATYP | DST.ADDR | DST.PORT |  PAYLOAD  |         |
         +------+----------+----------+-----------+ <-------+
         |  1   | Variable |    2     |  Variable |         |
         +------+----------+----------+-----------+         |
                                                            |
                                                   {"name": "ss-base"}
                                                            |
                                      +-----------+         |
                                      |   DATA    |         |
              Application Data -----> +-----------+ --------+
                                      |  Variable |
                                      +-----------+
```

## Preset

Like the graph above, each preset implements specific protocol or a part of protocol, for examples you can check out [src/presets](../../../src/presets).
