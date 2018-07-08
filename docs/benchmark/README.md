# benchmark

We use [iperf](https://en.wikipedia.org/wiki/Iperf) as network bandwidth measurement tool to measure **transfer/bitrate** among different preset combinations during a period of time.

## Prerequisites

* Linux or macOS
* Node.js 10.x or above
* iperf 3.x
* blinksocks 2.5.x or above

## Preparations

### 1. clone and install dependencies

```
$ git clone https://github.com/blinksocks/blinksocks
$ cd blinksocks
$ npm install
```

### 2. prepare test cases

Open and edit [benchmark/cases/**/*.bench.js], for usage about each preset, please check out [docs/presets].

### 3. run benchmark

```
$ npm run benchmark
```

benchmark will run each `*.bench.js` one by one and take a few minutes to get a report named `*.bench.json`.

### 4. get report

When the task is finished, a report table will be displayed on the screen. However, you can generate a standalone report by:

```
$ node benchmark/report.js <glob_pattern> ...
```

Here is an example output about network performance among different [shadowsocks stream ciphers] and [shadowsocks aead ciphers] implemented by **blinksocks**:

```
$ node benchmark/report.js benchmark/cases/shadowsocks/stream-cipher.bench.json
```

```
blinksocks:
version         3.3.4

Operating System:
cpu             Intel(R) Core(TM) i5-4278U CPU @ 2.60GHz
cores           4
memory          8589934592
type            Darwin
platform        darwin
arch            x64
release         17.6.0

Node.js Versions:
http_parser     2.8.0
node            10.5.0
v8              6.7.288.46-node.8
uv              1.20.3
zlib            1.2.11
ares            1.14.0
modules         64
nghttp2         1.32.0
napi            3
openssl         1.1.0h
icu             62.1
unicode         11.0
cldr            33.1
tz              2018e

(ranking):

┌─────────┬──────────────────────────────────────┬────────────────────┬─────────────────┬─────────────────┬────────────────────┐
│ (index) │                 file                 │    description     │    interval     │    transfer     │      bitrate       │
├─────────┼──────────────────────────────────────┼────────────────────┼─────────────────┼─────────────────┼────────────────────┤
│    0    │ 'shadowsocks/stream-cipher.bench.js' │       'none'       │ '0.00-3.02 sec' │  '1.5 GBytes'   │  '3.97 Gbits/sec'  │
│    1    │ 'shadowsocks/stream-cipher.bench.js' │   'aes-128-ctr'    │ '0.00-3.02 sec' │  '1.06 GBytes'  │  '2.8 Gbits/sec'   │
│    2    │ 'shadowsocks/stream-cipher.bench.js' │   'aes-192-ctr'    │ '0.00-3.03 sec' │  '1.03 GBytes'  │  '2.71 Gbits/sec'  │
│    3    │ 'shadowsocks/stream-cipher.bench.js' │   'aes-256-ctr'    │ '0.00-3.03 sec' │  '1.01 GBytes'  │  '2.67 Gbits/sec'  │
│    4    │ 'shadowsocks/stream-cipher.bench.js' │  'chacha20-ietf'   │ '0.00-3.05 sec' │ '985.45 MBytes' │  '2.52 Gbits/sec'  │
│    5    │ 'shadowsocks/stream-cipher.bench.js' │     'rc4-md5'      │ '0.00-3.03 sec' │ '720.23 MBytes' │  '1.86 Gbits/sec'  │
│    6    │ 'shadowsocks/stream-cipher.bench.js' │    'rc4-md5-6'     │ '0.00-3.05 sec' │ '712.31 MBytes' │  '1.82 Gbits/sec'  │
│    7    │ 'shadowsocks/stream-cipher.bench.js' │ 'camellia-128-cfb' │ '0.00-3.16 sec' │ '319.31 MBytes' │ '809.19 Mbits/sec' │
│    8    │ 'shadowsocks/stream-cipher.bench.js' │ 'camellia-192-cfb' │ '0.00-3.01 sec' │ '249.37 MBytes' │ '662.21 Mbits/sec' │
│    9    │ 'shadowsocks/stream-cipher.bench.js' │ 'camellia-256-cfb' │ '0.00-3.05 sec' │ '252.06 MBytes' │ '660.64 Mbits/sec' │
└─────────┴──────────────────────────────────────┴────────────────────┴─────────────────┴─────────────────┴────────────────────┘
```

> You can check out [benchmark/iperf.sh] and see how it works.

## History Reports

[See here](../../benchmark/reports).

[docs/presets]: ../presets
[benchmark/iperf.sh]: ../../benchmark/iperf.sh
[shadowsocks stream ciphers]: https://shadowsocks.org/en/spec/Stream-Ciphers.html
[shadowsocks aead ciphers]: https://shadowsocks.org/en/spec/AEAD-Ciphers.html
