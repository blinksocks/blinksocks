# benchmark

We use [iperf](https://en.wikipedia.org/wiki/Iperf) as network bandwidth measurement tool to measure **transfer/bandwidth** among different preset combinations during a period of time.

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
release         4.4.0-89-generic

Node.js Versions:
http_parser     2.7.0
node            8.2.1
v8              5.8.283.41
uv              1.13.1
zlib            1.2.11
ares            1.10.1-DEV
modules         57
openssl         1.0.2l
icu             59.1
unicode         9.0
cldr            31.0.1
tz              2017b

running tests...

------------ Test Case 0 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-ctr"}}]
Interval       Transfer       Bandwidth
0.0- 3.0 sec  1.63 GBytes  4.66 Gbits/sec
0.0- 2.7 sec  1.63 GBytes  5.26 Gbits/sec
-----------------------------------------

------------ Test Case 1 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-cfb"}}]
Interval       Transfer       Bandwidth
0.0- 3.0 sec  776 MBytes  2.17 Gbits/sec
0.0- 2.8 sec  776 MBytes  2.35 Gbits/sec
-----------------------------------------

------------ Test Case 2 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"camellia-256-cfb"}}]
Interval       Transfer       Bandwidth
0.0- 3.0 sec  296 MBytes  825 Mbits/sec
0.0- 2.7 sec  296 MBytes  912 Mbits/sec
-----------------------------------------

(best):

------------ Test Case 0 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-ctr"}}]
Interval       Transfer       Bandwidth
0.0- 3.0 sec  1.63 GBytes  4.66 Gbits/sec
0.0- 2.7 sec  1.63 GBytes  5.26 Gbits/sec
-----------------------------------------

Done in 18.47s.
```

As you can see, the program first lists **Operating System** and **Node.js Versions** parameters of the current platform.

Following the parameters, there are 3 test cases, each test case has different configuration(presets) defined in [benchmark/cases.js]. Test results are followed by configuration line.

The first line of results represents traffic from `iperf -c` to `bs-client` while the second represents traffic from `bs-server` to `iperf -s`.

```
[iperf -c] <----> [bs-client] <----> [bs-server] <----> [iperf -s]
                     1081               1082               1083
```

> You'd better check out [benchmark/iperf.sh] and figure out how it works.

**In my environment**, `aes-256-ctr` has the maximum transfer and bandwidth among these 3 test cases.

## History Reports

* [2017-8-11.txt](../../benchmark/reports/2017-8-11.txt)
* [2017-8-13.txt](../../benchmark/reports/2017-8-13.txt)
* [2017-8-14.txt](../../benchmark/reports/2017-8-14.txt)

[benchmark/cases.js]: ./cases.js
[benchmark/iperf.sh]: ./iperf.sh
[docs/presets]: ../docs/presets
[shadowsocks stream ciphers]: https://shadowsocks.org/en/spec/Stream-Ciphers.html
