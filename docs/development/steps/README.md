# Preparation

## Get the source

```
$ git clone https://github.com/blinksocks/blinksocks
```

## Install dependencies

```
$ cd blinksocks && npm install
```

## Start blinksocks

Prepare your configurations(**blinksocks.client.json** and **blinksocks.server.json**) in the project root folder, then start to test:

### Debug Mode(Use Chrome Developer Tool)

Debug in Chrome requires Node.js v6.x and Chrome 57 or later.

```
$ npm run debug:client
$ npm run debug:server
```

Then open **chrome://inspect/#devices** in Chrome, configure **Target discovery settings** then click **inspect** below **Remote Target**.

### Production Mode

```
$ npm run compile
$ npm run client
$ npm run server
```

This will run compiled code under **lib/**.

## Test

Any application support HTTP/Socks5/Socks4/Socks4a can be used for testing.

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

This will compile `src/*` to `lib/*`.

## Package

For users don't have Node.js installed, we use [zeit/pkg](https://github.com/zeit/pkg) to prepare compiled executables:

```
$ npm run pkg
```

This will generate compressed executables for different platforms named `blinksocks-{platform}-${arch}-${version}.gz`.
And can be distribute to target platform and architecture at once.
