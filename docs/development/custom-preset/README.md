# Custom Preset

### Prerequisites

Install `blinksocks` globally, it's usually already done:

```
$ npm install -g blinksocks
```

### Using blinksocks APIs

`blinksocks` provides several useful APIs to help you to integrate your own magic to the framework.

1. Create a js file named `my-custom-preset.js` then require `blinksocks` module:

```js
// my-custom-preset.js
const blinksocks = require('blinksocks');
```

2. Export a class that extends from [IPreset](../../../src/presets/defs.js) interface:

```js
// my-custom-preset.js
const blinksocks = require('blinksocks');

class MyCustomPreset extends blinksocks.IPreset {

  constructor(params) {
    super();
    console.log('hello from my custom preset', params);
  }

  // implement some of the methods you need

}

// static methods

MyCustomPreset.checkParams = function checkParams(params) {

};

MyCustomPreset.onInit = function onInit(params) {

};

module.exports = MyCustomPreset;
```

### API Details

You can implement some of the following methods to interpret data flow:

|  METHODS  |                                    DESCRIPTION                                    |
| :-------- | :-------------------------------------------------------------------------------- |
| clientOut | client received data from application, and ready to forward data to server.       |
| serverIn  | server received data from client, and ready to forward data to real destination.  |
| serverOut | server received data from real destination, and ready to backward data to client. |
| clientIn  | client received data from server, and ready to backward data to application.      |
| beforeOut | before calling clientOut() or serverOut().                                        |
| beforeIn  | before calling clientIn() or serverIn().                                          |

> Hint: `server*()` are running on the server side while `client*()` are running on the client side. `before*()` are running on both sides.

Each method gets an object which contains several parameters and callbacks you may need:

```js
clientOut({buffer, next, broadcast, direct, fail}) {
  // your magic here
}
```

|           PARAM           |                                                DESCRIPTION                                                 |
| :------------------------ | :--------------------------------------------------------------------------------------------------------- |
| buffer                    | output from the previous preset.                                                                           |
| next(buffer, isReverse)   | transmit processed buffer to the next preset. If isReverse is true, send data back to the previous preset. |
| broadcast(action)         | broadcast an action to other presets in the list.                                                          |
| direct(buffer, isReverse) | ignore the following presets, finish piping.                                                               |
| fail(message)             | report an error message when the preset fail to process.                                                   |

### Presets Decoupling

When communicate with other presets, you can pass an action to **broadcast(action)**.

**Action** is a plain object which only requires a `type` field:

```
// action
{
  type: <string>,
  ...
}
```

After broadcast, **all** other presets will receive the action in **onNotified(action)** immediately:

```js
const blinksocks = require('blinksocks');

class MyCustomPreset extends blinksocks.IPreset {

  /**
   * how to deal with the action, return false/undefined to ignore
   * @returns {boolean}
   */
  onNotified(/* action */) {
    return false;
  }

}

module.exports = MyCustomPreset;
```

All built-in actions are defined in `blinksocks.actions`.

> NOTE: `onNotified` is called **synchronous** when broadcast().

### Handle Address

You are probably want to know the target host and port when write your own preset, an action:

```js
{
  type: CONNECT_TO_REMOTE,
  payload: {host, port}
}
```

will be emitted once pipe created, you can access to it in `onNotified(action)` on client side or `broadcast(action)` it once decoded on server side:

```js
const blinksocks = require('blinksocks');
const {CONNECT_TO_REMOTE} = blinksocks.actions;

class MyCustomPreset extends blinksocks.IPreset {

  onNotified(action) {
    if (__IS_CLIENT__ && action.type === CONNECT_TO_REMOTE) {
      // host and port are obtained from client proxy protocol
      const {host, port} = action.payload;
      // 1.store on client side
    }
  }

  clientOut() {
    // 2.encode on client side
  }

  serverIn({..., broadcast}) {
    // 3.decode on server side
    broadcast({
      type: CONNECT_TO_REMOTE,
      payload: {
        host: _host,
        port: _port,
        onConnected: () => {
          // ...
        }
      }
    });
  }

}

module.exports = MyCustomPreset;
```
 
### Check Parameters

Your presets may require several parameters, and you can validate them in `constructor(params)`(every time a connection created)
or `checkParams(params)`(only once):

```js
const blinksocks = require('blinksocks');

class MyCustomPreset extends blinksocks.IPreset {

  constructor(params) {
    super();
    // here
  }

}

// check params passed to the preset, if any errors, should throw directly
MyCustomPreset.checkParams = function checkParams(params) {
  // or here
};

module.exports = MyCustomPreset;
```

### Improve Performance

You can initialize some shared/immutable data among connections in `onInit(params)` to improve performance:

```js
const blinksocks = require('blinksocks');

class MyCustomPreset extends blinksocks.IPreset {

}

// you can make some cache in this function
MyCustomPreset.onInit = function onInit(params) {

};

module.exports = MyCustomPreset;
```

### Access User Configuration

You can access user configuration directly from the `global` object anywhere in your preset class:

```js
const blinksocks = require('blinksocks');

class MyCustomPreset extends blinksocks.IPreset {

  constructor() {
    super();
    console.log(__KEY__);
  }

}

module.exports = MyCustomPreset;
```

**Available Items**

|                        |                      |
| :--------------------- | :------------------- |
| \_\_IS_SERVER\_\_      | \_\_DNS\_\_          |
| \_\_IS_CLIENT\_\_      | \_\_DNS_EXPIRE\_\_   |
| \_\_LOCAL_HOST\_\_     | \_\_TRANSPORT\_\_    |
| \_\_LOCAL_PORT\_\_     | \_\_TLS_CERT\_\_     |
| \_\_LOCAL_PROTOCOL\_\_ | \_\_TLS_KEY\_\_      |
| \_\_DSTADDR\_\_        | \_\_TIMEOUT\_\_      |
| \_\_SERVER_HOST\_\_    | \_\_REDIRECT\_\_     |
| \_\_SERVER_PORT\_\_    | \_\_LOG_PATH\_\_     |
| \_\_SERVERS\_\_        | \_\_LOG_LEVEL\_\_    |
| \_\_KEY\_\_            | \_\_LOG_MAX_DAYS\_\_ |
| \_\_PRESETS\_\_        | \_\_WORKERS\_\_      |
