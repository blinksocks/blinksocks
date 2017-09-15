#  Change Log

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

## [v2.5.4](https://github.com/blinksocks/blinksocks/tree/v2.5.4) (2017-08-22)

#### Features:

- add TLS/SSL transport for blinksocks over TLS [#92](https://github.com/blinksocks/blinksocks/issues/92)
- split tunnel mode from proxy.js to tunnel.js [#91](https://github.com/blinksocks/blinksocks/issues/91)

## [v2.5.3](https://github.com/blinksocks/blinksocks/tree/v2.5.3) (2017-08-16)

#### Features:

- add "-m, --minimal" to generate configs with minimal options [#90](https://github.com/blinksocks/blinksocks/issues/90)
- add "-l, --list-presets" option to show all built-in presets [#89](https://github.com/blinksocks/blinksocks/issues/89)
- built-in cluster mode [#88](https://github.com/blinksocks/blinksocks/issues/88)
- improve json generation for windows [#86](https://github.com/blinksocks/blinksocks/issues/86)

## [v2.5.2](https://github.com/blinksocks/blinksocks/tree/v2.5.2) (2017-08-13)

#### Features:

- add an initial broadcast to all presets when pipeline created [#85](https://github.com/blinksocks/blinksocks/issues/85)
- add a benchmark utility iperf [#84](https://github.com/blinksocks/blinksocks/issues/84)
- improve "proxy" preset to support tunnel mode for testing [#83](https://github.com/blinksocks/blinksocks/issues/83)
- refactor tasteless profile, using stats.js preset to achieve [#81](https://github.com/blinksocks/blinksocks/issues/81)
- deprecated cli-server.js and cli-client.js [#80](https://github.com/blinksocks/blinksocks/issues/80)
- generate port and timeout randomly in cli-init.js [#79](https://github.com/blinksocks/blinksocks/issues/79)

## [v2.5.1](https://github.com/blinksocks/blinksocks/tree/v2.5.1) (2017-08-09)

## [v2.5.0](https://github.com/blinksocks/blinksocks/tree/v2.5.0) (2017-08-09)

#### Features:

- pack src into a single file using webpack [#78](https://github.com/blinksocks/blinksocks/issues/78)

## [v2.4.9](https://github.com/blinksocks/blinksocks/tree/v2.4.9) (2017-08-04)

#### Features:

- add "dns_expire" option to configuration [#77](https://github.com/blinksocks/blinksocks/issues/77)
- add proxy preset [#76](https://github.com/blinksocks/blinksocks/issues/76)
- add noop preset for special use [#75](https://github.com/blinksocks/blinksocks/issues/75)
- display error buffer in hex for obfs-tls1.2-ticket [#73](https://github.com/blinksocks/blinksocks/issues/73)
- display preset name in error log [#72](https://github.com/blinksocks/blinksocks/issues/72)

#### Fixes:

- Destination port is wrong when relay ipv6 address [#68](https://github.com/blinksocks/blinksocks/issues/68)

## [v2.4.8](https://github.com/blinksocks/blinksocks/tree/v2.4.8) (2017-06-18)

#### Features:

- Allow to provide a list of sni to obfs-tls1.2-ticket [#67](https://github.com/blinksocks/blinksocks/issues/67)
- Allow to custom DNS servers [#66](https://github.com/blinksocks/blinksocks/issues/66)
- Add an enhanced AEAD preset without redundant logic [#63](https://github.com/blinksocks/blinksocks/issues/63)

#### Fixes:

- HTTP proxy doesn't work on Windows [#59](https://github.com/blinksocks/blinksocks/issues/59)

## [v2.4.7](https://github.com/blinksocks/blinksocks/tree/v2.4.7) (2017-06-10)

#### Features:

- Instantiating winston logger to improve integration [#65](https://github.com/blinksocks/blinksocks/issues/65)

## [v2.4.6](https://github.com/blinksocks/blinksocks/tree/v2.4.6) (2017-06-09)

#### Fixes:

- TypeError: Cannot read property 'bufferSize' of null [#64](https://github.com/blinksocks/blinksocks/issues/64)

## [v2.4.5](https://github.com/blinksocks/blinksocks/tree/v2.4.5) (2017-06-08)

#### Features:

- Use socket.setTimeout to detect connection timeout [#61](https://github.com/blinksocks/blinksocks/issues/61)
- Throttle uploads to reduce memory grow heavily when upload/download large files [#60](https://github.com/blinksocks/blinksocks/issues/60)

## [v2.4.4](https://github.com/blinksocks/blinksocks/tree/v2.4.4) (2017-06-03)

## [v2.4.3](https://github.com/blinksocks/blinksocks/tree/v2.4.3) (2017-06-02)

#### Fixes:

- ENOENT: no such file or directory, mkdir '~/.blinksocks/logs' [#58](https://github.com/blinksocks/blinksocks/issues/58)

#### Features:

- Log request address when applications connected to the client [#57](https://github.com/blinksocks/blinksocks/issues/57)

## [v2.4.2](https://github.com/blinksocks/blinksocks/tree/v2.4.2) (2017-05-29)

#### Fixes:

- Write logs to home directory [#55](https://github.com/blinksocks/blinksocks/issues/55)

## [v2.4.1](https://github.com/blinksocks/blinksocks/tree/v2.4.1) (2017-05-24)

## [v2.4.0](https://github.com/blinksocks/blinksocks/tree/v2.4.0) (2017-05-02)

## [v2.4.0-beta.4](https://github.com/blinksocks/blinksocks/tree/v2.4.0-beta.4) (2017-04-23)

#### Features:

- Presets: add TLS obfuscator [#52](https://github.com/blinksocks/blinksocks/issues/52)

#### Fixes:

- connection terminated while downloading a large file [#51](https://github.com/blinksocks/blinksocks/issues/51)

## [v2.4.0-beta.3](https://github.com/blinksocks/blinksocks/tree/v2.4.0-beta.3) (2017-04-17)

#### Fixes:

- "ss-aead-cipher" does not work at server side when use shadowsocks client [#50](https://github.com/blinksocks/blinksocks/issues/50)

#### Features:

- Multiple servers use different configurations [#48](https://github.com/blinksocks/blinksocks/issues/48)

## [v2.4.0-beta.2](https://github.com/blinksocks/blinksocks/tree/v2.4.0-beta.2) (2017-04-16)

#### Features:

- Verify DST.ADDR of "presets/ss-base" [#47](https://github.com/blinksocks/blinksocks/issues/47)

## [v2.4.0-beta.1](https://github.com/blinksocks/blinksocks/tree/v2.4.0-beta.1) (2017-04-13)

#### Features:

- Support configuration file with ".js" format [#49](https://github.com/blinksocks/blinksocks/issues/49)
- Lack of timeout mechanism [#45](https://github.com/blinksocks/blinksocks/issues/45)
- Robust design for middlewares [#40](https://github.com/blinksocks/blinksocks/issues/40)
- Add suitable presets to be compatible with shadowsocks protocols [#27](https://github.com/blinksocks/blinksocks/issues/27)

## [v2.3.0](https://github.com/blinksocks/blinksocks/tree/v2.3.0) (2017-04-09)

#### Features:

- Consider redirecting TCP stream to other host/port rather than close connections [#39](https://github.com/blinksocks/blinksocks/issues/39)
- Hot reload config.json [#37](https://github.com/blinksocks/blinksocks/issues/37)
- Share the same config.json between clients and servers [#35](https://github.com/blinksocks/blinksocks/issues/35)

## [v2.3.0-beta.3](https://github.com/blinksocks/blinksocks/tree/v2.3.0-beta.3) (2017-03-28)

#### Features:

- Disable a server by prefixing a '-' [#38](https://github.com/blinksocks/blinksocks/issues/38)

## [v2.3.0-beta.2](https://github.com/blinksocks/blinksocks/tree/v2.3.0-beta.2) (2017-03-24)

## [v2.3.0-beta.1](https://github.com/blinksocks/blinksocks/tree/v2.3.0-beta.1) (2017-03-23)

#### Features:

- Print connection track line once a socket was closed [#33](https://github.com/blinksocks/blinksocks/issues/33)
- Refactor docker deploy scripts [#32](https://github.com/blinksocks/blinksocks/issues/32)

#### Fixes:

- "blinksocks init" generates wrong configurations [#31](https://github.com/blinksocks/blinksocks/issues/31)
- Fix typo of git commit hook in package.json [#29](https://github.com/blinksocks/blinksocks/issues/29)

## [v2.2.2](https://github.com/blinksocks/blinksocks/tree/v2.2.2) (2017-03-18)

## [v2.2.1](https://github.com/blinksocks/blinksocks/tree/v2.2.1) (2017-03-15)

#### Features:

- Proposal: add performance test utilities [#23](https://github.com/blinksocks/blinksocks/issues/23)
- Proposal: add "init" sub command to auto-generate configuration pair [#17](https://github.com/blinksocks/blinksocks/issues/17)

## [v2.2.0-beta.5](https://github.com/blinksocks/blinksocks/tree/v2.2.0-beta.5) (2017-03-10)

#### Features:

- Proposal: multi-server mode [#24](https://github.com/blinksocks/blinksocks/issues/24)
- Refactor address.js then deprecate lodash dependencies [#20](https://github.com/blinksocks/blinksocks/issues/20)
- Proposal: implement new protocol preset aead v2  [#19](https://github.com/blinksocks/blinksocks/issues/19)
- Enhancement: error handling [#18](https://github.com/blinksocks/blinksocks/issues/18)

## [v2.2.0-beta.4](https://github.com/blinksocks/blinksocks/tree/v2.2.0-beta.4) (2017-03-05)

#### Features:

- Proposal: refactor crypto stuff in utils/crypto.js [#16](https://github.com/blinksocks/blinksocks/issues/16)

## [v2.2.0-beta.3](https://github.com/blinksocks/blinksocks/tree/v2.2.0-beta.3) (2017-03-02)
