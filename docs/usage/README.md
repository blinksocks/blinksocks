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

### * blinksocks init

This will generate `blinksocks.client.json` and `blinksocks.server.json` with a random key and default settings.

Then you should edit `blinksocks.client.json` to tell blinksocks client where is the server:

```
{
  // server host name or ip address
  host: "example.com",

  // server port
  port: 5678,
}
```

> You may also want to change default protocol stack(presets) or other settings, please check out [--config](../config)
for explanation of every option.

### * blinksocks client/server

```
$ blinksocks server --help

  Usage: blinksocks-server --config <file> [...]

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -c, --config <file>  a json/js format configuration file


  Examples:

    $ blinksocks client -c blinksocks.client.json
    $ blinksocks server -c blinksocks.server.json

```

## Run in production

You can take advantages of [pm2](https://github.com/unitech/pm2) to run blinksocks in the production.

Install `pm2` before running blinksocks in the production:

```
$ npm install -g pm2
```

### Daemon mode

```
$ pm2 start blinksocks-client -- -c blinksocks.client.json
```

### Cluster mode

```
$ pm2 start blinksocks-server -i 2 -- -c blinksocks.server.json
```

## For Firefox/Google Chrome and more...

You may want to use blinksocks to surf the Internet with **browsers**, so I give an advise here.

For Google Chrome, [SwitchyOmega](https://github.com/FelisCatus/SwitchyOmega) extension is a great approach to proxy your
connections by rules to blinksocks via socks5/socks4(a)/http.

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
