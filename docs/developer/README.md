# For Developer

## Get the source

```
$ git clone https://github.com/blinksocks/blinksocks
```

## Install dependencies

```
$ cd blinksocks && npm install
```

## Start blinksocks

Prepare your configurations and start to test:

```
$ bin/cli-init.js
$ bin/cli-run.js -c blinksocks.client.json
$ bin/cli-run.js -c blinksocks.server.json
```

## Verify

Any application support HTTP/Socks5/Socks4/Socks4a can be used for verification.

For example(use curl):

```
# Socks5
$ curl -L --socks5 localhost:1080 https://www.google.com
$ curl -L --socks5-hostname localhost:1080 https://www.google.com

# Socks4
$ curl -L --socks4 localhost:1080 https://www.google.com

# Socks4a
$ curl -L --socks4a localhost:1080 https://www.google.com

# HTTP
$ curl -L -x http://localhost:1080 https://www.google.com
```

## Compile

For production use, we are running our code under `lib` not `src`, so compilation is necessary.

Compilation of blinksocks is ultra easy:

```
$ npm run compile
```

This will compile `src` to `lib`.

## Deploy(Docker)

We use Docker to auto-deploy a blinksocks **server**.

### 1. Get image

You can build an image manually or pull it from docker hub:

* Build an image

```
$ cd <project-folder>/deploy
$ docker build --tag <user>/blinksocks:<version> --no-cache .
```

* Pull from docker hub

```
$ docker pull blinksocks:<version>
```

### 2. Run in a container

Container will expose `1080` port, so you must map a host port to `1080` via `-p`.

```
$ docker run -d -p 7777:1080 blinksocks:<version>
```

## Profile

By adding `--profile` option in the command line, you will get a report named `blinksocks.profile.log` after
the program was terminated.

```
$ blinksocks run ... --profile
```

The report contains several indicators grouped by different types:

```
{
  "sample": {
    "from": 1489813164761,
    "to": 1489821114265,
    "duration": 7949504
  },
  "instance": {
    "outSpeed": 0,
    "inSpeed": 0,
    "connections": 0,
    "errors": 0,
    "fatals": 0,
    "totalOut": 0,
    "totalIn": 0,
    "totalOutPackets": 0,
    "totalInPackets": 0,
    "totalBytes": 0,
    "totalPackets": 0,
    "errorRate": 0,
    "fatalRate": 0,
    "outBytesRate": 0,
    "outPacketsRate": 0,
    "inBytesRate": 0,
    "inPacketsRate": 0,
    "totalBytesRate": 0,
    "totalPacketsRate": 0
  },
  "summary": {
    "maxOutSpeed": 0,
    "maxInSpeed": 0,
    "maxConnections": 0
  },
  "node": {
    "upTime": 7952.505,
    "cpu": {
      "user": 5033903,
      "system": 623320
    },
    "memory": {
      "rss": 25964544,
      "heapTotal": 37154816,
      "heapUsed": 32861192,
      "external": 9284
    }
  }
}
```
