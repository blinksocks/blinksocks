# Guideline

## Proxy Application Data

```
  +----------------+   HTTP/SOCKS    +---------------------+ 
  |  applications  |---------------->|  blniksocks client  |
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

## Pipe

Pipe is a director which handle a list of preset, transmit data from the previous preset to the next.

Similar to TCP/IP protocol stack, you can define your own protocol in each layer. Application data are processed
**step by step** from the lowest layer to the top. Preset here act as specific layers in the stack.

Here is the original `shadowsocks` protocol implementation constructed by the following preset list:

```
{
  ...
  "presets": [
    {"name": "ss-base", "params": {}},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-cfb"}}
  ]
  ...
}
```

Pipe process data from `ss-base` to `ss-stream-cipher`:

```
+--------+----------------------------------------+
|   IV   |                PAYLOAD                 |
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
                                            {"name": "ss-base", "params": {}}
                                                            |
                                      +-----------+         |
                                      |   DATA    |         |
              Application Data -----> +-----------+ --------+
                                      |  Variable |
                                      +-----------+
```

## Preset

Preset implements a specific protocol, for examples you can check out [src/presets](../../src/presets).

### Custom Preset

To custom a preset, create a class then extends **IPreset** interface:

```js
// custom.js
import {IPreset} from './defs';

export default class CustomPreset extends IPreset {

  // implement some of the methods you need

}
```

You are probably want to know the destination host and port when write your own preset, an action `CONNECT_TO_REMOTE`
will be emitted once pipe created, then you can access to them via `action.payload`:

```js
import {IPreset, CONNECT_TO_REMOTE} from './defs';

export default class CustomPreset extends IPreset {

  onNotified(action) {
    if (__IS_CLIENT__ && action.type === CONNECT_TO_REMOTE) {
      // host and port are obtained from HTTP/SOCKS protocol
      const {host, port} = action.payload;
      // ...
    }
  }

  // ...

}
```

Next, you can implement some of the following methods to control data flow:

|  METHODS  |                                   DESCRIPTION                                    |
| :-------- | :------------------------------------------------------------------------------- |
| clientOut | client received data from application, and ready to forward data to server       |
| serverIn  | server received data from client, and ready to forward data to real destination  |
| serverOut | server received data from real destination, and ready to backward data to client |
| clientIn  | client received data from server, and ready to backward data to application      |
| beforeOut | before calling clientOut() or serverOut()                                        |
| beforeIn  | before calling clientIn() or serverIn()                                          |

> Hint: `server*()` are running on the server side while `client*()` are running on the client side. `before*()` are running on both sides.

Every method gets an object which contains several parameters you may need:

|           PARAM           |                                                    DESCRIPTION                                                     |
| :------------------------ | :----------------------------------------------------------------------------------------------------------------- |
| buffer                    | output from the previous preset                                                                                    |
| next(buffer, isReverse)   | transmit processed buffer to the next preset. If isReverse is true, send data back to the previous preset          |
| broadcast(action)         | broadcast an action to other presets                                                                               |
| direct(buffer, isReverse) | ignore the following presets, finish piping                                                                        |
| fail(message)             | report an error message when the preset fail to process                                                            |

### Check Parameters

Your presets may require several parameters, and you can validate them in `constructor(params)`(every time a connection created)
or `static checkParams(params)`(only once):

```js
import {IPreset} from './defs';

export default class CustomPreset extends IPreset {

  /**
   * check params passed to the preset, if any errors, should throw directly
   * @param params
   */
  static checkParams(params) {

  }

}
```

### Performance Improvements

You can initialize some shared/immutable data among connections in `static onInit(params)` to improve performance:

```js
import {IPreset} from './defs';

export default class CustomPreset extends IPreset {

  /**
   * you can make some cache in this function
   * @param params
   */
  static onInit(params) {

  }

}
```

### Presets Decoupling

When communicate with other presets, you can pass an action to broadcast().

Action is a plain object which only requires a `type` field:

```
// action
{
  type: <string>,
  ...
}
```

When broadcast, **all** other presets will receive the action in **onNotified(action)** immediately:

```js
import {IPreset} from './defs';

export default class CustomPreset extends IPreset {

  /**
   * how to deal with the action, return false/undefined to ignore
   * @returns {boolean}
   */
  onNotified(/* action */) {
    return false;
  }

  // ...

}
```

> NOTE: `onNotified` is **synchronous**.

### Access User Configuration

You can access user configuration directly from `global` in your preset:

```js
import {IPreset} from './defs';

export default class CustomPreset extends IPreset {
  
  constructor() {
    super();
    console.log(__KEY__);
  }
  
}
```

**available items**

|          NAME          |
| :--------------------- |
| \_\_IS_SERVER\_\_      |
| \_\_IS_CLIENT\_\_      |
| \_\_LOCAL_HOST\_\_     |
| \_\_LOCAL_PORT\_\_     |
| \_\_LOCAL_PROTOCOL\_\_ |
| \_\_DSTADDR\_\_        |
| \_\_SERVER_HOST\_\_    |
| \_\_SERVER_PORT\_\_    |
| \_\_SERVERS\_\_        |
| \_\_KEY\_\_            |
| \_\_PRESETS\_\_        |
| \_\_DNS\_\_            |
| \_\_DNS_EXPIRE\_\_     |
| \_\_TRANSPORT\_\_      |
| \_\_TLS_CERT\_\_       |
| \_\_TLS_KEY\_\_        |
| \_\_TIMEOUT\_\_        |
| \_\_REDIRECT\_\_       |
| \_\_LOG_PATH\_\_       |
| \_\_LOG_LEVEL\_\_      |
| \_\_LOG_MAX_DAYS\_\_   |
| \_\_WORKERS\_\_        |
