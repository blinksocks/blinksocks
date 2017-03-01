# Protocol Stack

The protocol stack of blinksocks is middleware based and ultra **flexible**.

Like TCP/IP, you can define your own protocol in each layer.
Application data are processed **step by step** from the lowest layer to the top.

Middlewares here act as a specific layers in the stack.

We have four kind of middlewares currently, however the classification among middlewares **is not fixed**.
You can add or subtract some middlewares on demand.

A typical protocol stack is defined as following(**just for example**):

```
# TCP handshake

+-----------+-------------------------------------------------------+
|  HEADER   |                     PAYLOAD                           |
+-----------+-------------------------------------------------------+ <-------+
| Variable  |                     Variable                          |         |
+-----------+-------------------------------------------------------+         |
                                                                        ObfsMiddleware(--obfs="http")
            +-----+-------------------------------------------------+         |
            | LEN |                    PAYLOAD                      |         |
            +-----+-------------------------------------------------+ <-------+
            |  2  |                    Variable                     |         |
            +-----+-------------------------------------------------+         |
                                                                        ProtocolMiddleware(--protocol="basic")
                  +--------+----------------------------------------+         |
                  |   IV   |                PAYLOAD                 |         |
                  +--------+----------------------------------------+ <-------+
                  |   16   |                Variable                |         |
                  +--------+----------------------------------------+         |
                                                                              |
                                                                        CryptoMiddleware(--crypto="openssl")
                           +------+----------+----------+-----------+         |
                           | ATYP | DST.ADDR | DST.PORT |  PAYLOAD  |         |
                           +------+----------+----------+-----------+ <-------+
                           |  1   | Variable |    2     |  Variable |         |
                           +------+----------+----------+-----------+         |
                                                                        FrameMiddleware(--frame="origin")
                                                        +-----------+         |
                                                        |   DATA    |         |
                                Application Data -----> +-----------+ --------+
                                                        |  Variable |
                                                        +-----------+

# TCP chunk

                  +-----------------+
                  |    PAYLOAD      |
                  +-----------------+ <-------+
                  |    Variable     |         |
                  +-----------------+         |
                                        ObfsMiddleware(--obfs="http")
                  +-----+-----------+         |
                  | LEN |  PAYLOAD  |         |
                  +-----+-----------+ <-------+
                  |  2  |  Variable |         |
                  +-----+-----------+         |
                                        ProtocolMiddleware(--protocol="basic")
                        +-----------+         |
                        |  PAYLOAD  |         |
                        +-----------+ <-------+
                        |  Variable |         |
                        +-----------+         |
                                              |
                                        CryptoMiddleware(--crypto="openssl")
                        +-----------+         |
                        |  PAYLOAD  |         |
                        +-----------+ <-------+
                        |  Variable |         |
                        +-----------+         |
                                        FrameMiddleware(--frame="origin")
                        +-----------+         |
                        |   DATA    |         |
Application Data -----> +-----------+ --------+
                        |  Variable |
                        +-----------+
```

As you can see, you start from **Application Data**, custom middleware behaviour in each preset and
send them out.

Ordinarily, `DST.ADDR` and `DST.PORT` is required to be sent to server(like "origin" preset),
otherwise server cannot figure out where to send data to.

Blinksocks will pass **target address** to the FrameMiddleware once a connection between application
and blinksocks client was constructed, so you can obtain that address in your frame preset.

```js
// core/socket.js
this._pipe.setMiddlewares(MIDDLEWARE_DIRECTION_UPWARD, [
  createMiddleware(MIDDLEWARE_TYPE_FRAME, [this._targetAddress]),
  createMiddleware(MIDDLEWARE_TYPE_CRYPTO),
  createMiddleware(MIDDLEWARE_TYPE_PROTOCOL),
  createMiddleware(MIDDLEWARE_TYPE_OBFS),
]);
```

```js
// preset/frame/origin.js
export default class OriginFrame extends IPreset {

  _targetAddress = null; // client use only

  constructor(address) {
    super();
    this._targetAddress = address;
  }

  // ...

}
```

# Presets

For more document about built-in presets, please check out each implementation
files in [src/presets](../../src/presets).
