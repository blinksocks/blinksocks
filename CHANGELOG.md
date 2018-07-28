#  Change Log

## 3.3.6 (2018-07-28)

### :rocket: Features & Improvements

- **package**: upgrade `ws` to `6.0.0`.
- **package**: upgrade `jest` and fix test environment.
- **src**: reduce `MaxListenersExceededWarning`s.
- **src**: load `libsodium-wrappers` on demand.

### :bug: Bug Fixes:

- **core**: fix `TypeError: Cannot read property 'push' of null`.

### Migrating from 3.3.5 to 3.3.6

```
$ npm install -g blinksocks@3.3.6
```

## 3.3.5 (2018-07-14)

### :rocket: Features & Improvements

- **benchmark**: refactor.
- **package**: upgrade `ws` to `5.2.2` and `winston-daily-rotate-file` to `3.3.0`.
- **src**: reduce memory usage when enable `multiplexing`.
- **src**: weakly dependent on `http2` module.

### Migrating from 3.3.4 to 3.3.5

```
$ npm install -g blinksocks@3.3.5
```

## 3.3.4 (2018-07-07)

### :exclamation: Notable Changes

- **presets**:
  - Add new encryption algorithms(`aes-128-ccm`, `aes-192-ccm` and `aes-256-ccm`) to `ss-aead-cipher`.

### :rocket: Features & Improvements

- **package**: add `semver` to compare versions.
- **ci**: log curl error message.
- **core**: remove mux related things from `Pipe`.
- **core**: move `core/speed-tester.js` to `utils/speed-tester.js`.
- **docs**: add a [basic example](./docs/examples/basic).
- **docs**: add an example of [using kcptun with blinksocks](./docs/examples/kcptun).
- **transports**: refactor `ws` transport.
- **transports**: remove dependency on `http2session` for `h2` transport.
- **transports**: decouple `drain` event from other bounds.
- **transports**: reduce memory usage of `ws` and `wss`.
- **transports**: disable the Nagle algorithm and enable keep-alive functionality of `tcp`.

### :bug: Bug Fixes:

- **core**: fix connection status record of `Hub`.
- **core**: check writable of inbound before using it in `MuxRelay`.
- **transports**: fix crash when error occurred in http2stream. [#105](https://github.com/blinksocks/blinksocks/issues/105)

### Migrating from 3.3.3 to 3.3.4

```
$ npm install -g blinksocks@3.3.4
```

## 3.3.3 (2018-06-24)

### :rocket: Features & Improvements

- **src**: refactor multiplexing to pass pressure test.
- **test**: add test case for https and redirect.
- **deps**: upgrade `ws` to v5.2.1, `winston-daily-rotate-file` to v3.2.3.

### :bug: Bug Fixes:

- **presets**: fail() should return undefined.

### Migrating from 3.3.2 to 3.3.3

```
$ npm install -g blinksocks@3.3.3
```

## 3.3.2 (2018-06-17)

### :exclamation: Notable Changes

`http2` transport is added in version. For usage please refer to [examples/http2](./docs/examples/http2).

### :rocket: Features & Improvements

- **src**: refactor handling presets failure.
- **docs**: add examples of using http2 and http2/caddy.

### :bug: Bug Fixes:

- **core**: fix wss multiplexing.
- **transports**: fix tcp error logging.
- **proxies**: fix a vulnerability in log output.

### Migrating from 3.3.1 to 3.3.2

```
$ npm install -g blinksocks@3.3.2
```

## 3.3.1 (2018-06-15)

### :rocket: Features & Improvements

- **package**: upgrade winston to v3.0.0.
- **proxies**: add `https` support.
- **transport**: set handshake timeout of ws to 10s.
- **docs**: add `Test Using curl`.
- **docs**: add a batch of [examples](./docs/examples).

### :bug: Bug Fixes:

- **config**: fix default port issue.

### Migrating from 3.3.0 to 3.3.1

```
$ npm install -g blinksocks@3.3.1
```

## 3.3.0 (2018-06-12)

### :exclamation: Notable Changes

- **transports**: add `wss`([WebSocket/TLS](docs/config#blinksocks-over-websockettls)).

If you encounter the following warning, and the certificate is `self-signed`, please add `"tls_cert_self_signed": true` to client configuration and provide server certificate in `"tls_cert"` as well:

```
warn: [xxx:outbound] [x.x.x.x:xxxxx] self signed certificate
```

```diff
--- a/blinksocks.client.old.json
+++ b/blinksocks.client.new.json
 {
   "service": "socks5://127.0.0.1:1081",
   "server": {
     "service": "tls://localhost:1082",
     "key": "AuM3R$]Pnj^Cqg^9",
     "presets": [
@@ -18,11 +17,10 @@
     "mux": false,
     "mux_concurrency": 10,
     "tls_cert": "cert.pem",
+    "tls_cert_self_signed": true
   },
   "dns": [],
   "dns_expire": 3600,
   "timeout": 300,
```

### :rocket: Features & Improvements

- **config**: add `tls_cert_self_signed` option.

### :bug: Bug Fixes:

- **transports/tls**: require `"tls_cert_self_signed": true` if use `self-singed` certificate.

### Migrating from 3.2.2 to 3.3.0

```
$ npm install -g blinksocks@3.3.0
```

## 3.2.2 (2018-06-10)

### :exclamation: Notable Changes

> For security reason, **executables** are no longer uploaded in the following releases, we only publish npm packages.

### :rocket: Features & Improvements

- **deploy**: add `install-run-debian.sh`.
- **transports**: add `pathname` support for websocket.

### :bug: Bug Fixes:

- **proxies**: fix a security bug of authorization bypass when use `socks` or `http` protocol.

### Migrating from 3.2.1 to 3.2.2

```
$ npm install -g blinksocks@3.2.2
```

## 3.2.1 (2018-05-12)

### :rocket: Features & Improvements

- **benchmark**: add test for chacha20-ietf.
- **hub**: set a timer to prune udp relays.
- **src**: move constants from `presets/actions.js` to `src/constants.js`.
- **src**: remove `preset.js`, implement `_write()` in `IPreset`.
- **test**: add udp test for `obfs-tls1.2-ticket`.

### :bug: Bug Fixes:

- **core**: add `speed-tester.js`, fix speed measurement.

### Migrating from 3.2.0 to 3.2.1

```
$ npm install -g blinksocks@3.2.1
```

## 3.2.0 (2018-04-28)

> Node.js 10 is supported in this version!

### :exclamation: Notable Changes

- **src**: support socks4(a), socks5, http `basic authorization`(username/password).
- **presets**: add `IPresetAddressing::onInitTargetAddress()` and `IPresetAddressing::resolveTargetAddress()`.
- **presets**: add `chacha20-ietf` method for `ss-stream-cipher`, but require Node.js 10.x.
- **presets**: deprecated `IPreset::onNotified()`.
- **presets**: deprecated `auto-conf` preset.

### :rocket: Features & Improvements

- **core**: add `Pipe::initTargetAddress()`.
- **utils**: add `uint64ToBuffer()`, `incrementLE()` and `incrementBE()`.
- **package**: upgrade ws from v3.3.3 to v5.1.1.
- **package**: use WHATWG URL API instead of legacy qs api.
- **package**: add package-lock.json.
- **package**: remove unused dependencies.
- **ci**: add test on the latest stable Node.js.

### :bug: Bug Fixes:

- **hub**: fix sequence between calling `relay::on()` and `relay.init()`.
- **hub**: patch `server.getConnections()` for ws.

### Migrating from 3.1.1 to 3.2.0

```
$ npm install -g blinksocks@3.2.0
```

## 3.1.1 (2018-04-10)

### :rocket: Features & Improvements

- **api**: remove Hub::getPerformance().
- **api**: add Hub::getUploadSpeed(), Hub::getDownloadSpeed() and Hub::getConnStatuses().
- **benchmark**: enlarge wait time before kill iperf server.
- **package**: upgrade winston logger to v3.
- **package**: remove husky and precommit hook, it's annoying.
- **test**: add udp tests for multiplexing.
- **docs**: add usage for systemd.

### :bug: Bug Fixes:

- src: fix crash when onConnected() triggered after ss-base is destroyed.

### Migrating from 3.0.0 to 3.1.1

```
$ npm install -g blinksocks@3.1.1
```

## 3.1.0 (2018-03-11)

> The minimal version of Node.js required is 8.x now, please upgrade your Node.js if necessary.

### :rocket: Features & Improvements

- **lib**: compiled to Node.js 8.
- **core**: start udp server only when use socks protocol on client.
- **core**: add performance.js to collect upload/download speed.
- **core**: add Hub::getConnections(), Hub::getTotalRead(), Hub::getTotalWritten() and Hub::getPerformance().
- **test**: add tests for udp relay.
- **test**: add tests for multiplexing over ws and tls.

### :bug: Bug Fixes:

- **src**: reduce error rate when enable multiplexing on server.
- **core**: include target address in tracker's log when enable multiplexing.
- **core**: avoid putting duplicate target address in tracker's log.

### Migrating from 3.0.0 to 3.1.0

```
$ npm install -g blinksocks@3.1.0
```

## 3.0.0 (2018-02-27)

### :boom: Breaking Changes:

- **bin/init**: remove "workers".
- **bin/init**: replace "servers: []" to "server: {}".
- **core**: remove balancer.
- **presets**: remove `stats` preset.
- **presets**: remove `tracker` preset, re-implement in core.
- **presets**: remove `access-control` preset, re-implement in core.

### :rocket: Features & Improvements

- **bin/init**: add "acl" and "acl_conf" on server side.
- **src**: refactor src/dns-cache.js and move it to utils/.
- **src**: move config items from global to local.
- **core**: expose Config::getLogFilePath().
- **benchmark**: use json output of iperf.
- **presets/mux**: discretize cid and other improvements.
- **ci**: add scripts to do nightly release automatically.
- **test**: add e2e tests.

### :bug: Bug Fixes:

- **src**: fix "send() is not a function" when using mux though http proxy.
- **core**: fix "cannot read property 'remoteInfo' of null" of mux-relay.js.
- **core**: fix sub connection id collision.
- **core**: handle listen "error" event.

### Committers: 2

* [Micooz](https://github.com/micooz)
* [Indexyz](https://github.com/Indexyz)

### Migrating from 2.9.0 to 3.0.0

```
$ npm install -g blinksocks@3.0.0
```

After v3, blinksocks no longer support multiple servers and cluster mode, so you should make some changes in your client config.json after upgrade:

```diff
--- a/blinksocks.client.old.json
+++ b/blinksocks.client.new.json
 {
   "service": "socks5://127.0.0.1:1081?forward=127.0.0.1:1083",
-  "servers": [{
-    "enabled": true,
+  "server": {
     "service": "tcp://localhost:1082",
     "key": "AuM3R$]Pnj^Cqg^9",
     "presets": [
@@ -18,11 +17,10 @@
     "mux": false,
     "mux_concurrency": 10,
     "tls_cert": "cert.pem"
-  }],
+  },
   "dns": [],
   "dns_expire": 3600,
   "timeout": 300,
-  "workers": 0,
   "log_path": "bs-client.log",
   "log_level": "debug",
   "log_max_days": 1
```

`access-control` preset was removed in v3 as well, if you want to enable ACL on server side, please add `acl` and `acl_conf` to server.json:

```diff
--- a/blinksocks.server.old.json
+++ b/blinksocks.server.new.json
@@ -14,12 +14,13 @@
   ],
   "tls_key": "key.pem",
   "tls_cert": "cert.pem",
+  "acl": true,
+  "acl_conf": "acl.txt",
   "mux": false,
   "dns": [],
   "dns_expire": 3600,
   "timeout": 300,
   "redirect": "",
-  "workers": 0,
   "log_path": "bs-server.log",
   "log_level": "debug",
   "log_max_days": 1
```

## 2.9.0 (2018-02-03)

> TCP/TLS/WS [multiplexing](docs/config#multiplexing) is introduced in this version. :sparkles:

### :boom: Breaking Changes:

- presets: remove base-auth-stream and base-with-padding.
- config: remove "dstaddr", use uri querystring "?forward" instead.

### :rocket: Features & Improvements

- **core**: add mux-relay.
- **benchmark**: archive reports of 2017.
- **package**: upgrade pkg to v4.3.0.
- **package**: compile before running benchmark.
- **presets**: add mux preset.
- **transports**: refactor and optimize websocket transport.
- **transports**: add this.ctx.
- **transports**: add mux transport.
- **utils**: add a faster version of crypto.randomBytes().
**
### :bug: Bug Fixes:

- **proxies**: fix crash when client reset the socks connection later.
- **utils**: fix getRandomInt().
- **utils**: remove generateMutexId().

### Upgrade from 2.8.5 to 2.9.0

```
$ npm install -g blinksocks@2.9.0
```

## 2.8.5 (2017-12-13)

### :rocket: Features & Improvements

- **bin/init**: add `obfs-random-padding` to presets by default.
- **benchmark**: use project version rather than installed version.
- **core**: pre-init presets at startup.
- **package**: bundle Node.js runtime v8.9.0 to binaries.
- **package**: run compile before benchmark.
- **presets/ss-stream-cipher**: add `none` method for `ssr-auth-chain-*`.
- **presets/auto-conf**: protocol change: UTC field is now encrypted by rc4.
- **presets/auto-conf**: allow to load suites from remote.

### :bug: Bug Fixes:

- **balancer**: fix `undefined` bug when only use `service` in configuration.
- **transports/tcp**: handle half-close correctly.
- **transports/udp**: fix a bug when use `auto-conf` preset.

### Upgrade from 2.8.4 to 2.8.5

```
$ npm install -g blinksocks@2.8.5
```

## 2.8.4 (2017-11-22)

> dynamic protocol is introduced in this version, it's an **experimental** feature.

To use dynamic protocol, prepare a `suites.json` or pick one from the [official versions](suites), then change your preset list(on both client and server) to:

```
"presets": [
  {
    "name": "auto-conf",
    "params": {
      "suites": "suites.json"
    }
  },
  // no other presets
]
```

### :rocket: Features & Improvements

- **core**: support dynamic protocol. :sparkles:
- **presets**: add **auto-conf**. :sparkles:

### :bug: Bug Fixes:

- **core**: prevent calling onReceive() on null inbound during udp relay.
- **transports**: wait until connection established before reply to peer.
- **transports**: fix RangeError \[ERR_SOCKET_BAD_PORT\] when sending data via udp socket.

### Upgrade from 2.8.3 to 2.8.4

```
$ npm install -g blinksocks@2.8.4
```

## 2.8.3 (2017-11-07)

### :bug: Bug Fixes:

- **presets**: fix hard coded "userKey" in ssr-auth-xxx.

### Upgrade from 2.8.2 to 2.8.3

```
$ npm install -g blinksocks@2.8.3
```

## 2.8.2 (2017-11-07)

### :rocket: Features & Improvements

- **presets**: add **ssr-auth-aes128-md5**, **ssr-auth-aes128-sha1**. :sparkles:
- **presets**: add **ssr-auth-chain-a**, **ssr-auth-chain-b**. :sparkles:
- **presets**: add **rc4-md5**, **rc4-md5-6** methods to **ss-stream-cipher**.
- **presets**: refactor **obfs-http**.
- **presets**: apply a padding strategy to reduce heavy bandwidth usage of **obfs-random-padding**.
- **presets**: add getName() interface and readProperty() helper function.
- **presets**: expose headSize getter of ss-base, expose iv getter of ss-stream-cipher.
- **benchmark**: add test cases for ssr-*.
- **utils**: add dumpHex().

### :bug: Bug Fixes:

- **core**: destroy relay when inbound closed.
- **benchmark**: bypass error cases.

### Upgrade from 2.8.1 to 2.8.2

```
$ npm install -g blinksocks@2.8.2
```

## 2.8.1 (2017-10-28)

### :rocket: Features & Improvements

- **presets**: print transport type in tracker preset.

### :bug: Bug Fixes:

- **transports**: fix verbose log for udp transport.

### Upgrade from 2.8.0 to 2.8.1

```
$ npm install -g blinksocks@2.8.1
```

## 2.8.0 (2017-10-27)

> UDP relay is now available for testing! :beers:

### :boom: Breaking Changes:

- **presets**: deprecated **base-auth-stream** and **base-with-padding** presets, please use **base-auth** instead.

### :rocket: Features & Improvements

- **bin**: add "-w" option to force overwrite exist jsons.
- **src**: expose all api interfaces to the top package level.
- **core**: add UDP relay support. :sparkles:
- **core**: disable json output to reduce log size.
- **core**: refactor presets creation.
- **core**: convert port to Number after parsed by url.parse().
- **proxies**: log error details when received invalid requests.
- **transports**: reduce memory grow for websocket.
- **transports**: pause inbound receiving before remote connection established.
- **presets**: allow to use external presets. :sparkles:
- **presets**: add [base-auth](docs/presets#base-auth) preset. :sparkles:
- **presets**: implement protocols for UDP. :sparkles:
- **test**: add test for `base-auth` preset.

### :bug: Bug Fixes:

- **package**: fix `pkg` command.

### Upgrade from 2.7.0 to 2.8.0

```
$ npm install -g blinksocks@2.8.0
```

To use external presets, please read [presets](docs/presets#use-external-preset).

## 2.7.0 (2017-10-17)

### :boom: Breaking Changes:

- **preset**: remove over designed "proxy" and "tunnel" preset.
- **preset**: remove useless "exp-compress" preset.
- **package**: remove unnecessary webpack bundle.
- **transports**: change "websocket" to "ws".

### :rocket: Features & Improvements:

- **core**: add "service" and "dstaddr" option.
- **core**: refactor service creation of hub.
- **benchmark**: rearrange test cases.
- **proxies**: refactor http, socks4(a) and socks5, use more lightweight approach.
- **proxies**: add "tcp" transparent proxy.
- **presets**: add `chacha20-poly1305`, `chacha20-ietf-poly1305`, `xchacha20-ietf-poly1305` support for ss-aead-cipher.
- **presets**: add `chacha20-poly1305` support for v2ray-vmess.
- **utils**: remove unsafe parseURI().

### :bug: Fixes:

- **core**: destroy socket when "end" emitted.
- **presets**: fix "invalid length: 0" error caused by obfs-random-padding.
- **test**: fix preset runner.

### Upgrade from 2.6.3 to 2.7.0

```
$ npm install -g blinksocks@2.7.0
```

### :exclamation: Notice

1. blinksocks client no longer handle both http and socks proxy connections at the same port now, please specify only one of them using `service`:

```
// client.json
{
  "service": "socks5://<host>:<port>"
  // or "service": "http://<host>:<port>"
}
```

2. If you are using websocket transport, please change `websocket` to `ws`:

```
// client.json
{
  "servers": [{
    "service": "ws://<host>:<port>",
    // or "transport": "ws"
  }]
}

// server.json
{
  "service": "ws://<host>:<port>"
  // or "transport": "ws"
}
```

## 2.6.3 (2017-10-09)

### :rocket: Features & Improvements:

- **benchmark**: rank by bitrate instead of transfer.
- **core**: add "log_max_days" option to configuration.
- **core**: improve pipe performance.
- **package**: bundle node runtime v8.6.0 to binaries.

To keep the last 30 days logs, add `log_max_days` to your configuration:

```json
{
  "log_max_days": 30
}
```

### :bug: Fixes:

- **core**: clear preset cache after switched to another server.
- **core**: fix compatibility to node v6.x.
- **doc**: fix links of benchmark.
- **transports**: make context sync return.
- **transports**: fix TypeError: Cannot read property 'send' of null when using websocket.
- **package**: fix "main" field.

## 2.6.2 (2017-09-21)

### Notable Changes

Two experimental presets are ready for production use:

`exp-base-with-padding` is linked to `base-with-padding`.
`exp-base-auth-stream` is linked to `base-auth-stream`.

For backward compatibility, you can still use `exp-xxx` without changing configurations.

### :boom: Breaking Changes:

- **core**: deprecated ~~__IS_TLS__~~, you should make judgement by __TRANSPORT__ instead.

### :rocket: Features & Improvements:

- **core**: display dns cache hitting info in verbose log level.
- **transports**: abstract transport layer, and add **websocket**. :sparkles:
- **presets**: refactor exp-compress, expose "threshold" and "options" parameters.
- **test**: refactor preset runner, run preset through Middleware directly.

### :bug: Fixes:

- **presets**: fix an "out-of-range" bug in v2ray-vmess.
- **presets**: fix access to static members.

## 2.6.1 (2017-09-15)

### :rocket: Features & Improvements:

- **benchmark**: print blinksocks version before running tests.
- **benchmark**: add v2ray-vmess benchmark.
- **utils**: add `clear()` method to `AdvancedBuffer`.
- **utils**: split common module into separated modules.
- **presets**: add [v2ray vmess](https://www.v2ray.com/chapter_02/protocols/vmess.html) support. :sparkles:
- **presets**: **info** now removed from `ss-aead-cipher`, always use "ss-subkey".
- **presets**: **info** now has a default value **bs-subkey** for `aead-random-cipher`.
- **presets**: add `static onInit()`, `next()` method to IPreset and remove `PRESET_INIT` action.
- **presets**: improve performance and reduce memory usage.
- **tests**: add e2e tests for presets.

### :bug: Fixes:

- **core**: fix a typo in action-handler.js.

## 2.6.0 (2017-09-06)

### :boom: Breaking Changes:

- **bin**: remove **.js** configuration file support, now you can only use **.json** file.
- **core**: remove ~~behaviours~~ because it's not as convenient as I thought.
- **package**: now **lib/** is back.

### :rocket: Features & Improvements:

- **benchmark**: add tests for `obfs-random-padding`.
- **bin**: try to load config file from the first argument.
- **core**: refactor relay and change **MAX_BUFFERED_SIZE** to 512KB.
- **core**: refactor pipe.js.
- **core**: refactor middleware.js.
- **presets**: add a new class `IPresetStatic` which extends from IPreset.
- **presets**: add `static checkParams()` to IPreset and move all parameters check logic to it.
- **presets**: add `onDestroy()` lifecycle hook to IPreset.
- **presets**: add `fail()` and `broadcast()` convenience methods to IPreset.
- **presets**: add [access-control](src/presets/access-control.js).
- **presets**: add [exp-compress](src/presets/exp-compress.js).
- **presets**: add [obfs-random-padding](src/presets/obfs-random-padding.js).
- **presets**: allow to set relative path to `save_to` of [stats](src/presets/stats.js) preset.

### :bug: Fixes:

- **benchmark**: ranking by `SUM` of receiver transfer.
- **benchmark**: remove `log_path` in generated jsons.
- **core**: prevent calling close() on null in hub.
- **core**: prevent onNotified() emitter itself.
- **presets**: fix several indicators of stats preset.
- **utils**: fix getRandomInt() and isValidPort().
