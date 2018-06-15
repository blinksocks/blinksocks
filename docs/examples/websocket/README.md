# websocket

**Minimal Version Required: v2.6.2**

blinksocks can transfer data using `websocket`:

```
+-------------+                      +-------------+           +------------+
|             |  ws://site.com/path  |             |   tcp://  |            |
|  bs-client  <---------------------->  bs-server  <----------->   Target   |
|             |                      |             |           |            |
+-------------+                      +-------------+           +------------+
```
