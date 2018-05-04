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
const { Hub } = require('blinksocks');
const hub = new Hub(clientConfig);

hub.run()
  .then(() => {
    console.log('blinksocks client is running now');
  })
  .catch((err) => {
    console.error(err);
  });
```

Or use **async/await** for convenience:

```js
const { Hub } = require('blinksocks');
const hub = new Hub(clientConfig);

try {
  await hub.run();
  console.log('blinksocks client is running now');
} catch (err) {
  console.error(err);
}
```

### hub.terminate()

* Returns a `<Promise>`.

Close all living connections and destroy the hub instance.

### hub.getConnections()

* Returns connection number associate with the hub.

### hub.getTotalRead()

* Returns total download bytes from server/client.

### hub.getTotalWritten()

* Returns total upload bytes to server/client.

### hub.getUploadSpeed()

* Returns upload bytes per second.

### hub.getDownloadSpeed()

* Returns download bytes per second.

### hub.getConnStatuses()

* Returns current status of all connections.

Results for example:

```json
[
  {
    "id": "conn_1",
    "stage": 2,
    "startTime": 1523344893955,
    "sourceHost": "127.0.0.1",
    "sourcePort": 56739,
    "targetHost": "facebook.com",
    "targetPort": 443,
    "endTime": 1523344894457
  },
  {
    "id": "conn_2",
    "stage": 1,
    "startTime": 1523344894134,
    "sourceHost": "127.0.0.1",
    "sourcePort": 56742,
    "targetHost": "cx.atdmt.com",
    "targetPort": 443
  }
]
```

### Stage Constants

- `CONN_STAGE_INIT`: 0
- `CONN_STAGE_TRANSFER`: 1
- `CONN_STAGE_FINISH`: 2
- `CONN_STAGE_ERROR`: 3

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
clientOut({ buffer, next, fail }) {
  // your magic here
  // return a buffer or next(a buffer)
}
```

|           PARAM           |                                                DESCRIPTION                                                 |
| :------------------------ | :--------------------------------------------------------------------------------------------------------- |
| buffer                    | output from the previous preset.                                                                           |
| next(buffer, isReverse)   | transmit processed buffer to the next preset. If isReverse is true, send data back to the previous preset. |
| fail(message)             | report an error message when the preset fail to process.                                                   |

### Handle Address

You probably want to know the target host and port when write your own preset on `client` side, `IPresetAddressing::onInitTargetAddress()` will be called with target `host` and `port`:

```js
const { IPresetAddressing } = require('blinksocks');

class MyCustomPreset extends IPresetAddressing {

  onInitTargetAddress({ host, port }) {
    // got target host and port here
  }

}
```

After target address resolved on `server` side, you should call `this.resolveTargetAddress()` explicit:

```js
const { IPresetAddressing } = require('blinksocks');

class MyCustomPreset extends IPresetAddressing {

  serverIn() {
    this.resolveTargetAddress({ host, port }, () => {
      // successfully connected to the target address
    });
  }

}

module.exports = MyCustomPreset;
```
 
### Check Parameters

Your presets may require several parameters, and you can validate them in:
 
* `constructor({ config, params })`(every time a connection created)
* `static onCheckParams(params)`(only once, recommended)

```js
class MyCustomPreset extends blinksocks.IPreset {
  
  constructor(props) {
    super(props);
    // check props.params
  }

}

// check params passed to the preset, if any errors, should throw directly
MyCustomPreset.onCheckParams = function onCheckParams(params) {
  // or here (recommended)
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

You can access user configuration anywhere via `this._config` in your preset:

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

**this.next(type, buffer)**

The same as `next` parameter in each hook function, but here you should provide `type` to tell which pipe direction the data should transfer to.

**this.readProperty(presetName, propertyName)**

Directly read a property from other presets, this is useful when your logic have to depend on other presets.

**this.getStore()**

Returns the store you modified in or returned from `onCache(params, store)`.
