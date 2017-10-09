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

benchmark will take a few minutes to get a full report, the more test cases you added in [benchmark/cases.js] the more time it will spend.

### 4. get report

Here is an example output about network performance of different [shadowsocks stream ciphers] and [shadowsocks aead ciphers] implemented by **blinksocks**:

```
blinksocks version:
2.6.3

Operating System:
cpu             Intel(R) Core(TM) i3-4160 CPU @ 3.60GHz
cores           4
memory          16722886656
type            Linux
platform        linux
arch            x64
release         4.4.0-96-generic

Node.js Versions:
http_parser     2.7.0
node            8.6.0
v8              6.0.287.53
uv              1.14.1
zlib            1.2.11
ares            1.10.1-DEV
modules         57
nghttp2         1.25.0
openssl         1.0.2l
icu             59.1
unicode         9.0
cldr            31.0.1
tz              2017b

running tests...

------------ Test Case 0 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-ctr"}}]
Interval         Transfer     Bitrate
0.00-3.00   sec  1.89 GBytes  5.42 Gbits/sec  sender
0.00-3.11   sec  1.77 GBytes  4.88 Gbits/sec  receiver
-----------------------------------------

------------ Test Case 1 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-cfb"}}]
Interval         Transfer     Bitrate
0.00-3.00   sec  994 MBytes  2.78 Gbits/sec  sender
0.00-3.31   sec  890 MBytes  2.26 Gbits/sec  receiver
-----------------------------------------

------------ Test Case 2 ----------------
[{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"camellia-256-cfb"}}]
Interval         Transfer     Bitrate
0.00-3.00   sec  502 MBytes  1.40 Gbits/sec  sender
0.00-3.73   sec  394 MBytes  887 Mbits/sec  receiver
-----------------------------------------

------------ Test Case 3 ----------------
[{"name":"ss-base"},{"name":"ss-aead-cipher","params":{"method":"aes-256-gcm"}}]
Interval         Transfer     Bitrate
0.00-3.00   sec  804 MBytes  2.25 Gbits/sec  sender
0.00-3.31   sec  489 MBytes  1.24 Gbits/sec  receiver
-----------------------------------------

(ranking):

 1: Test Case 0, Bitrate=[5.42 Gbits/sec, 4.88 Gbits/sec], [{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-ctr"}}]
 2: Test Case 1, Bitrate=[2.78 Gbits/sec, 2.26 Gbits/sec], [{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"aes-256-cfb"}}]
 3: Test Case 3, Bitrate=[2.25 Gbits/sec, 1.24 Gbits/sec], [{"name":"ss-base"},{"name":"ss-aead-cipher","params":{"method":"aes-256-gcm"}}]
 4: Test Case 2, Bitrate=[1.40 Gbits/sec, 887 Mbits/sec], [{"name":"ss-base"},{"name":"ss-stream-cipher","params":{"method":"camellia-256-cfb"}}]

Done in 59.51s.
```

As you can see, the program first lists **blinksocks version**, **Operating System** and **Node.js Versions** parameters of the current platform.

Following the parameters, there are 3 test cases, each test case has different configuration(presets) defined in [benchmark/cases.js]. Test results are followed by configuration line.

The first line of results represents traffic from `iperf -c` to `bs-client` while the second represents traffic from `bs-server` to `iperf -s`.

```
[iperf -c] <----> [bs-client] <----> [bs-server] <----> [iperf -s]
                     1081               1082               1083
```

> You'd better check out [benchmark/iperf.sh] and figure out how it works.

**In my environment**, `aes-256-ctr` has the maximum transfer and bitrate among these 4 test cases.

## History Reports

* [2017-8-11.txt](../../benchmark/reports/2017-8-11.txt)
* [2017-8-13.txt](../../benchmark/reports/2017-8-13.txt)
* [2017-8-14.txt](../../benchmark/reports/2017-8-14.txt)
* [2017-8-28.txt](../../benchmark/reports/2017-8-28.txt)
* [2017-8-29.txt](../../benchmark/reports/2017-8-29.txt)
* [2017-09-06.txt](../../benchmark/reports/2017-09-06.txt)
* [2017-09-14.txt](../../benchmark/reports/2017-09-14.txt)
* [2017-09-15.txt](../../benchmark/reports/2017-09-15.txt)
* [2017-09-21.txt](../../benchmark/reports/2017-09-21.txt)
* [2017-10-04.txt](../../benchmark/reports/2017-10-04.txt)
* [2017-10-09.txt](../../benchmark/reports/2017-10-09.txt)

[benchmark/cases.js]: ../../benchmark/cases.js
[benchmark/iperf.sh]: ../../benchmark/iperf.sh
[docs/presets]: ../presets
[shadowsocks stream ciphers]: https://shadowsocks.org/en/spec/Stream-Ciphers.html
[shadowsocks aead ciphers]: https://shadowsocks.org/en/spec/AEAD-Ciphers.html
