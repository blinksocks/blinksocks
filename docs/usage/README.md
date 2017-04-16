## Usage

Once installed, you can access blinksocks via CLI:

```
$ blinksocks --help

  Usage: blinksocks [command] [options]


  Commands:

    init              generate configurations with random key
    client [options]  start a client
    server [options]  start a server
    help [cmd]        display help for [cmd]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

```

## Git-style sub-command

There are threes commands to do different tasks:

### blinksocks init

This will generate `blinksocks.client.js` and `blinksocks.server.js` with a random key and default settings.

### blinksocks client/server

```
$ blinksocks server --help

  Usage: blinksocks-server --config <file> [...]

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -c, --config <file>  a json/js format configuration file


  Examples:

    $ blinksocks client -c blinksocks.client.js
    $ blinksocks server -c blinksocks.server.js

```

> Please check out [--config](../config) for detailed explanation of every options.

## Run in production

You can take advantages of [pm2](https://github.com/unitech/pm2) to run blinksocks in the production.

Install `pm2` before running blinksocks in the production:

```
$ npm install -g pm2
```

### Daemon mode

```
$ pm2 start blinksocks-client -- -c blinksocks.client.js
```

### Cluster mode

```
$ pm2 start blinksocks-server -i 2 -- -c blinksocks.server.js
```

## For Firefox/Google Chrome and more...

You may want to use blinksocks to surf the Internet with **browsers**, so I give an advise here.

For Google Chrome, [SwitchyOmega](https://github.com/FelisCatus/SwitchyOmega) extension is a great approach to use socks5 service.

For FireFox, you can configure proxy at `Preferences - Advanced - Network - Settings`.

## Deploy(Using Docker)

We can use Docker to auto-deploy a blinksocks **server**.

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
