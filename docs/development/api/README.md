# API

`blinksocks` provides several useful APIs to help you to integrate your own magic to the framework.

## Prerequisites

Install `blinksocks` globally, it's usually already done:

```
$ npm install -g blinksocks
```

Then you can `require` it in your code:

```js
const blinksocks = require('blinksocks');
```

## Class: Hub

The `Hub` class can be used to create a blinksocks client/server instance with different configurations.

### new Hub(config)

* `config` a configuration in plain object.

### hub.run()

* Returns a `<Promise>`.

```js
const client = new blinksocks.Hub(clientConfig);

client.run()
  .then(() => {
    console.log('blinksocks client is running now');
  })
  .catch((err) => {
    console.error(err);
  });
```

### hub.terminate()

* Returns a `<Promise>`.

Close all living connections and destroy the hub instance.

## Class: IPreset

The `IPreset` class defines a specific protocol, acting as data stream interpreter.

Export a class that extends from [IPreset](../../../src/presets/defs.js) interface:

```js
class MyCustomPreset extends blinksocks.IPreset {

  constructor(props) {
    super(props);
    console.log('hello from my custom preset');
  }

  // implement some of the methods you need

}

// implement static methods

MyCustomPreset.onCheckParams = function onCheckParams(params) {

};

MyCustomPreset.onCache = function onCache(params, store) {

};

module.exports = MyCustomPreset;
```

### Hooks

You can implement some of the following methods to interact with data stream:

|  METHODS  |                                    DESCRIPTION                                    |
| :-------- | :-------------------------------------------------------------------------------- |
| clientOut | client received data from application, and ready to forward data to server.       |
| serverIn  | server received data from client, and ready to forward data to real destination.  |
| serverOut | server received data from real destination, and ready to backward data to client. |
| clientIn  | client received data from server, and ready to backward data to application.      |
| beforeOut | before calling clientOut() or serverOut().                                        |
| beforeIn  | before calling clientIn() or serverIn().                                          |

> Hint: `server*()` are running on the server side while `client*()` are running on the client side. `before*()` are running on both sides.

> Hint: To transfer **UDP** packets, just postfix "Udp" to each methods and implement UDP specific protocol in them, e.g, `clientOutUdp()`.

Each method gets an object which contains several parameters and callbacks you may need:

```js
clientOut({buffer, next, broadcast, direct, fail}) {
  // your magic here
  // return a buffer or next(a buffer)
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

When communicate with other presets, you can emit an action by **broadcast(action)**.

**Action** is a plain object which only requires a `type` field:

```
// action
{
  type: <string>,
  ...
}
```

After broadcast, **all** other presets will receive the action in **onNotified(action)** synchronously:

```js
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
const {IPreset, CONNECT_TO_REMOTE} = require('blinksocks');

class MyCustomPreset extends IPreset {

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

Your presets may require several parameters, and you can validate them in:
 
* `constructor({ config, params })`(every time a connection created)
* `onCheckParams(params)`(only once, recommended)

```js
class MyCustomPreset extends blinksocks.IPreset {

}

// check params passed to the preset, if any errors, should throw directly
MyCustomPreset.onCheckParams = function onCheckParams(params) {
  // or here
};

module.exports = MyCustomPreset;
```

### Improve Performance

You can initialize some shared/immutable data among connections in `onCache(params)` to improve performance:

```js
class MyCustomPreset extends blinksocks.IPreset {

}

/**
* you can make some cache in store or just return something
* you want to put in store, then access store later in other
* hook functions via this.getStore()
* @param params
* @param store
*/
MyCustomPreset.onCache = function onCache(params, store) {
  // or return something
};

module.exports = MyCustomPreset;
```

### Access Configuration

You can access configuration from `this._config` in your preset:

```js
class MyCustomPreset extends blinksocks.IPreset {

  constructor(props) {
    super(props);
    console.log(this._config.key);
  }

}

module.exports = MyCustomPreset;
```

For full items you can access to, please read [Config](../../../src/core/config.js).

### Helper Functions

The following functions are auto-generated to your preset, DO NOT overwrite them:

**this.next(direction, buffer)**

The same as `next` parameter in each hook function, but here you should provide `direction` to tell which direction the data should transfer to.

**this.broadcast(action)**

The same as `broadcast` parameter in each hook function.

**this.fail(message)**

The same as `fail` parameter in each hook function.

**this.readProperty(presetName, propertyName)**

Directly read a property from other presets, this is useful when your logic have to depend on other presets.

**this.getStore()**

Returns the store you modified in or returned from `onCache(params, store)`.
