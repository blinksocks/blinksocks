#  Change Log



## [v2.4.6](https://github.com/blinksocks/blinksocks/tree/v2.4.6) (2017-06-09)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.4.5...v2.4.6)

#### Fixes (bugs & defects):

- TypeError: Cannot read property 'bufferSize' of null [#64](https://github.com/blinksocks/blinksocks/issues/64)

## [v2.4.5](https://github.com/blinksocks/blinksocks/tree/v2.4.5) (2017-06-08)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.4.4...v2.4.5)

#### Features:

- Use socket.setTimeout to detect connection timeout [#61](https://github.com/blinksocks/blinksocks/issues/61)
- Throttle uploads to reduce memory grow heavily when upload/download large files [#60](https://github.com/blinksocks/blinksocks/issues/60)

## [v2.4.4](https://github.com/blinksocks/blinksocks/tree/v2.4.4) (2017-06-03)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.4.3...v2.4.4)

#### Fixes (bugs & defects):

- HTTP proxy dosen't work on Windows [#59](https://github.com/blinksocks/blinksocks/issues/59)

## [v2.4.3](https://github.com/blinksocks/blinksocks/tree/v2.4.3) (2017-06-02)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.4.2...v2.4.3)

#### Fixes (bugs & defects):

- ENOENT: no such file or directory, mkdir '~/.blinksocks/logs' [#58](https://github.com/blinksocks/blinksocks/issues/58)

#### Features:

- Log request address when applications connected to the client [#57](https://github.com/blinksocks/blinksocks/issues/57)

## [v2.4.2](https://github.com/blinksocks/blinksocks/tree/v2.4.2) (2017-05-29)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.4.1...v2.4.2)

#### Fixes (bugs & defects):

- Write logs to home directory [#55](https://github.com/blinksocks/blinksocks/issues/55)

## [v2.4.1](https://github.com/blinksocks/blinksocks/tree/v2.4.1) (2017-05-24)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.4.0...v2.4.1)

## [v2.4.0](https://github.com/blinksocks/blinksocks/tree/v2.4.0) (2017-05-02)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.4.0-beta.4...v2.4.0)

## [v2.4.0-beta.4](https://github.com/blinksocks/blinksocks/tree/v2.4.0-beta.4) (2017-04-23)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.4.0-beta.3...v2.4.0-beta.4)

#### Features:

- Presets: add TLS obfuscator [#52](https://github.com/blinksocks/blinksocks/issues/52)

#### Fixes (bugs & defects):

- connection terminated while downloading a large file [#51](https://github.com/blinksocks/blinksocks/issues/51)

## [v2.4.0-beta.3](https://github.com/blinksocks/blinksocks/tree/v2.4.0-beta.3) (2017-04-17)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.4.0-beta.2...v2.4.0-beta.3)

#### Fixes (bugs & defects):

- "ss-aead-cipher" does not work at server side when use shadowsocks client [#50](https://github.com/blinksocks/blinksocks/issues/50)

#### Features:

- Multiple servers use different configurations [#48](https://github.com/blinksocks/blinksocks/issues/48)

## [v2.4.0-beta.2](https://github.com/blinksocks/blinksocks/tree/v2.4.0-beta.2) (2017-04-16)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.4.0-beta.1...v2.4.0-beta.2)

#### Features:

- Verify DST.ADDR of "presets/ss-base" [#47](https://github.com/blinksocks/blinksocks/issues/47)

## [v2.4.0-beta.1](https://github.com/blinksocks/blinksocks/tree/v2.4.0-beta.1) (2017-04-13)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.3.0...v2.4.0-beta.1)

#### Features:

- Support configuration file with ".js" format [#49](https://github.com/blinksocks/blinksocks/issues/49)
- Lack of timeout mechanism [#45](https://github.com/blinksocks/blinksocks/issues/45)
- Robust design for middlewares [#40](https://github.com/blinksocks/blinksocks/issues/40)
- Add suitable presets to be compatible with shadowsocks protocols [#27](https://github.com/blinksocks/blinksocks/issues/27)

## [v2.3.0](https://github.com/blinksocks/blinksocks/tree/v2.3.0) (2017-04-09)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.3.0-beta.3...v2.3.0)

#### Features:

- Consider redirecting TCP stream to other host/port rather than close connections [#39](https://github.com/blinksocks/blinksocks/issues/39)
- Hot reload config.json [#37](https://github.com/blinksocks/blinksocks/issues/37)
- Share the same config.json between clients and servers [#35](https://github.com/blinksocks/blinksocks/issues/35)

## [v2.3.0-beta.3](https://github.com/blinksocks/blinksocks/tree/v2.3.0-beta.3) (2017-03-28)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.3.0-beta.2...v2.3.0-beta.3)

#### Features:

- Disable a server by prefixing a '-' [#38](https://github.com/blinksocks/blinksocks/issues/38)

## [v2.3.0-beta.2](https://github.com/blinksocks/blinksocks/tree/v2.3.0-beta.2) (2017-03-24)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.3.0-beta.1...v2.3.0-beta.2)

## [v2.3.0-beta.1](https://github.com/blinksocks/blinksocks/tree/v2.3.0-beta.1) (2017-03-23)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.2.2...v2.3.0-beta.1)

#### Features:

- Print connection track line once a socket was closed [#33](https://github.com/blinksocks/blinksocks/issues/33)
- Refactor docker deploy scripts [#32](https://github.com/blinksocks/blinksocks/issues/32)

#### Fixes (bugs & defects):

- "blinksocks init" generates wrong configurations [#31](https://github.com/blinksocks/blinksocks/issues/31)
- Fix typo of git commit hook in package.json [#29](https://github.com/blinksocks/blinksocks/issues/29)

## [v2.2.2](https://github.com/blinksocks/blinksocks/tree/v2.2.2) (2017-03-18)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.2.1...v2.2.2)

## [v2.2.1](https://github.com/blinksocks/blinksocks/tree/v2.2.1) (2017-03-15)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.2.0-beta.5...v2.2.1)

#### Features:

- Proposal: add performance test utilities [#23](https://github.com/blinksocks/blinksocks/issues/23)
- Proposal: add "init" sub command to auto-generate configuration pair [#17](https://github.com/blinksocks/blinksocks/issues/17)

## [v2.2.0-beta.5](https://github.com/blinksocks/blinksocks/tree/v2.2.0-beta.5) (2017-03-10)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.2.0-beta.4...v2.2.0-beta.5)

#### Features:

- Proposal: multi-server mode [#24](https://github.com/blinksocks/blinksocks/issues/24)
- Refactor address.js then deprecate lodash dependencies [#20](https://github.com/blinksocks/blinksocks/issues/20)
- Proposal: implement new protocol preset aead v2  [#19](https://github.com/blinksocks/blinksocks/issues/19)
- Enhancement: error handling [#18](https://github.com/blinksocks/blinksocks/issues/18)

## [v2.2.0-beta.4](https://github.com/blinksocks/blinksocks/tree/v2.2.0-beta.4) (2017-03-05)
[Full Changelog](https://github.com/blinksocks/blinksocks/compare/v2.2.0-beta.3...v2.2.0-beta.4)

#### Features:

- Proposal: refactor crypto stuff in utils/crypto.js [#16](https://github.com/blinksocks/blinksocks/issues/16)

## [v2.2.0-beta.3](https://github.com/blinksocks/blinksocks/tree/v2.2.0-beta.3) (2017-03-02)
