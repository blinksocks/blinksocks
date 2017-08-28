# benchmark

We use [iperf](https://en.wikipedia.org/wiki/Iperf) as network bandwidth measurement tool to measure **transfer/bitrate** among different preset combinations during a period of time.

## Prerequisites

* Linux or macOS
* Node.js 8.x or above
* iperf 3.x
* blinksocks 2.5.x or above

## Preparations

### 1. clone and install blinksocks globally

```
$ git clone https://github.com/blinksocks/blinksocks
$ cd blinksocks
$ npm install
$ npm install -g .
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

benchmark will take a few minutes to get a full report, the more test cases you specified in [benchmark/cases.js] the more time it will spend.

### 4. get report

Here is an example output about network performance of different [shadowsocks stream ciphers] implemented by **blinksocks**:

```
Operating System:
cpu             Intel(R) Core(TM) i3-4160 CPU @ 3.60GHz
cores           4
memory          16722907136
type            Linux
platform        linux
arch            x64
release         4.4.0-92-generic

Node.js Versions:
http_parser     2.7.0
node            8.4.0
v8              6.0.286.52
uv              1.13.1
zlib            1.2.11
ares            1.10.1-DEV
modules         57
nghttp2         1.22.0
openssl         1.0.2l
icu             59.1
unicode         9.0
cldr            31.0.1
tz              2017b

running tests...

------------ Test Case 0 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-ctr"}}]
Interval         Transfer     Bitrate
0.00-5.00   sec  3.36 GBytes  5.77 Gbits/sec  sender
0.00-5.11   sec  3.25 GBytes  5.46 Gbits/sec  receiver
-----------------------------------------

------------ Test Case 1 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-cfb"}}]
Interval         Transfer     Bitrate
0.00-5.00   sec  1.53 GBytes  2.64 Gbits/sec  sender
0.00-5.26   sec  1.43 GBytes  2.33 Gbits/sec  receiver
-----------------------------------------

------------ Test Case 2 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"camellia-256-cfb"}}]
Interval         Transfer     Bitrate
0.00-5.00   sec  734 MBytes  1.23 Gbits/sec  sender
0.00-5.78   sec  632 MBytes  917 Mbits/sec  receiver
-----------------------------------------

(ranking):

 1: Test Case 0, Transfer=[3.36 GBytes, 3.25 GBytes], [{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-ctr"}}]
 2: Test Case 1, Transfer=[1.53 GBytes, 1.43 GBytes], [{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-cfb"}}]
 3: Test Case 2, Transfer=[734 MBytes, 632 MBytes], [{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"camellia-256-cfb"}}]

Done in 50.86s.
```

As you can see, the program first lists **Operating System** and **Node.js Versions** parameters of the current platform.

Following the parameters, there are 3 test cases, each test case has different configuration(presets) defined in [benchmark/cases.js]. Test results are followed by configuration line.

The first line of results represents traffic from `iperf -c` to `bs-client` while the second represents traffic from `bs-server` to `iperf -s`.

```
[iperf -c] <----> [bs-client] <----> [bs-server] <----> [iperf -s]
                     1081               1082               1083
```

> You'd better check out [benchmark/iperf.sh] and figure out how it works.

**In my environment**, `aes-256-ctr` has the maximum transfer and bitrate among these 3 test cases.

## History Reports

* [2017-8-11.txt](../../benchmark/reports/2017-8-11.txt)
* [2017-8-13.txt](../../benchmark/reports/2017-8-13.txt)
* [2017-8-14.txt](../../benchmark/reports/2017-8-14.txt)
* [2017-8-28.txt](../../benchmark/reports/2017-8-28.txt)

[benchmark/cases.js]: ./cases.js
[benchmark/iperf.sh]: ./iperf.sh
[docs/presets]: ../docs/presets
[shadowsocks stream ciphers]: https://shadowsocks.org/en/spec/Stream-Ciphers.html
