# Multiplexing

**Minimal Version Required: v2.9.x**

blinksocks supports TCP/TLS/WS multiplexing.

```
+--------+  Conn 1  +-----------+                       +-----------+  Conn 1  +--------+
|        <---------->           |                       |           <---------->        |
|        |  Conn 2  |           |    Mux Connections    |           |  Conn 2  |        |
|        <---------->           <----------------------->           <----------+        |
|  Apps  |  Conn 3  | bs-client |          ...          | bs-server |  Conn 3  |  Dest  |
|        <---------->           <----------------------->           <---------->        |
|        |  Conn 4  |           |                       |           |  Conn 4  |        |
|        <---------->           |                       |           <---------->        |
+--------+          +-----------+                       +-----------+          +--------+
```

Multiplexing can:

* Reduce the number of connections between bs-client and bs-server.
* Eliminate three-way handshake of TCP and reduce connection latency between `bs-client` and `bs-server`.
* Obfuscating traffic characteristics.

You can enable this feature easily by setting `"mux": true` on both client and server, and set `"mux_concurrency": <number>` on client.

1. Client config

```
{
  ...
  "server": {
    ...
    "mux": true,
    "mux_concurrency": 10
   ...
  },
  ...
}
```

2. Server config

```
{
  "mux": true,
  ...
}
```
