# benchmark

We use [iperf](https://en.wikipedia.org/wiki/Iperf) as network bandwidth measurement tool to measure **transfer/bitrate** among different preset combinations during a period of time.

## Prerequisites

* Linux or macOS
* Node.js 8.x or above
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

Open and edit [benchmark/cases.js], choose what you want to test.

For usage about each preset, please check out [docs/presets].

### 3. run benchmark

```
$ npm run benchmark
```

Save stdout/stderr to files:

```
$ npm run benchmark > report.txt 2> error.txt
```

benchmark will take a few minutes to get a full report, the more test cases you added in [benchmark/cases.js] the more time it will spend.

### 4. get report

Here is an example output about network performance of different [shadowsocks stream ciphers] and [shadowsocks aead ciphers] implemented by **blinksocks**:

```
blinksocks version:
2.8.4

Operating System:
cpu             Intel(R) Core(TM) i3-4160 CPU @ 3.60GHz
cores           4
memory          16722878464
type            Linux
platform        linux
arch            x64
release         4.4.0-101-generic

Node.js Versions:
http_parser     2.7.0
node            8.9.3
v8              6.1.534.48
uv              1.15.0
zlib            1.2.11
ares            1.10.1-DEV
modules         57
nghttp2         1.25.0
openssl         1.0.2n
icu             59.1
unicode         9.0
cldr            31.0.1
tz              2017b

running 4 tests...

------------ Test Case 0 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-ctr"}}]
Interval         Transfer     Bitrate
0.00-3.00   sec  1.84 GBytes  5.26 Gbits/sec  sender
0.00-3.12   sec  1.71 GBytes  4.71 Gbits/sec  receiver
-----------------------------------------

------------ Test Case 1 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-cfb"}}]
Interval         Transfer     Bitrate
0.00-3.00   sec  972 MBytes  2.72 Gbits/sec  sender
0.00-3.30   sec  856 MBytes  2.18 Gbits/sec  receiver
-----------------------------------------

------------ Test Case 2 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"camellia-256-cfb"}}]
Interval         Transfer     Bitrate
0.00-3.00   sec  510 MBytes  1.43 Gbits/sec  sender
0.00-3.58   sec  382 MBytes  896 Mbits/sec  receiver
-----------------------------------------

------------ Test Case 3 ----------------
[{"name":"ss-base"},{"name":"ss-aead-cipher","params":{"method":"aes-256-gcm"}}]
Interval         Transfer     Bitrate
0.00-3.00   sec  731 MBytes  2.04 Gbits/sec  sender
0.00-3.89   sec  642 MBytes  1.38 Gbits/sec  receiver
-----------------------------------------

(ranking):

 1: Test Case 0, Bitrate = 5.26 Gbits/sec, 4.71 Gbits/sec
    [{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-ctr"}}]
 2: Test Case 1, Bitrate = 2.72 Gbits/sec, 2.18 Gbits/sec
    [{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-cfb"}}]
 3: Test Case 3, Bitrate = 2.04 Gbits/sec, 1.38 Gbits/sec
    [{"name":"ss-base"},{"name":"ss-aead-cipher","params":{"method":"aes-256-gcm"}}]
 4: Test Case 2, Bitrate = 1.43 Gbits/sec, 896 Mbits/sec
    [{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"camellia-256-cfb"}}]

Done in 61.94s.
```

As you can see, the program first lists **blinksocks version**, **Operating System** and **Node.js Versions** parameters of the current platform.

Following the parameters, there are 4 test cases, each test case has different configuration(presets) defined in [benchmark/cases.js]. Test results are followed by configuration line.

The first line of results represents traffic from `iperf -c` to `bs-client` while the second represents traffic from `bs-server` to `iperf -s`.

```
[iperf -c] <----> [bs-client] <----> [bs-server] <----> [iperf -s]
                     1081               1082               1083
```

> You'd better check out [benchmark/iperf.sh] and figure out how it works.

**In my environment**, stream cipher with `aes-256-ctr` encryption method has the maximum transfer as well as bitrate among these 4 test cases.

## History Reports

[See here](../../benchmark/reports).

[docs/presets]: ../presets
[benchmark/cases.js]: ../../benchmark/cases.js
[benchmark/iperf.sh]: ../../benchmark/iperf.sh
[shadowsocks stream ciphers]: https://shadowsocks.org/en/spec/Stream-Ciphers.html
[shadowsocks aead ciphers]: https://shadowsocks.org/en/spec/AEAD-Ciphers.html
