# Multiplexing

**Minimal Version Required: v2.9.x**

blinksocks supports TCP/TLS/WS multiplexing.

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
