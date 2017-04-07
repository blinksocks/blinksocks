## Usage

Once installed, you can access blinksocks via CLI:

```
$ blinksocks --help

  Usage: blinksocks [command] [options]


  Commands:

    init              generate configuration randomly
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

This will generate `blinksocks.client.json` and `blinksocks.server.json` pair with a random key and default settings.

### blinksocks client/server

```
$ blinksocks server --help

  Usage: blinksocks-server --host <host> --port <port> --key <key> [...]

  Options:

    -h, --help                           output usage information
    -V, --version                        output the version number
    -c, --config [file]                  a json format file for configuration
    --host <host>                        an ip address or a hostname to bind, default: 'localhost'
    --port <port>                        where to listen on, default: 1080
    --servers [servers]                  a list of servers used by client, split by comma, default: ''
    --key <key>                          a key for encryption and decryption
    --frame [frame]                      a preset used in frame middleware, default: 'origin'
    --frame-params [crypto-params]       parameters for frame preset, default: ''
    --crypto [crypto]                    a preset used in crypto middleware, default: ''
    --crypto-params [crypto-params]      parameters for crypto, default: 'aes-256-cfb'
    --protocol [protocol]                a preset used in protocol middleware, default: 'aead'
    --protocol-params [protocol-params]  parameters for protocol, default: 'aes-256-gcm,ss-subkey'
    --obfs [obfs]                        a preset used in obfs middleware, default: ''
    --obfs-params [obfs-params]          parameters for obfs, default: ''
    --redirect [redirect]                redirect stream to here when any preset fail to process, default: ''
    --log-level [log-level]              log level, default: 'silly'
    -q, --quiet [quiet]                  force log level to 'error', default: false
    -w, --watch [watch]                  hot reload config.json specified via -c, default: true
    --profile [profile]                  generate performance statistics, store at blinksocks.profile.log once exit, default: false


  Examples:
  
  As simple as possible:
    $ blinksocks client -c config.json --watch
  
  To start a server:
    $ blinksocks server --host 0.0.0.0 --port 7777 --key password
  
  To start a client:
    $ blinksocks client --host localhost --port 1080 --key password --servers=node1.test.com:7777,node2.test.com:7777

```

> Please check out [config.json](../config) for detail explanation of every options.

## Run in production

You can take advantages of [pm2](https://github.com/unitech/pm2) to run blinksocks in the production.

Install `pm2` before running blinksocks in the production:

```
$ npm install -g pm2
```

### Daemon mode

```
$ pm2 start blinksocks-client -- -c config.json
```

### Cluster mode

```
$ pm2 start blinksocks-server -i 2 -- -c config.json
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
