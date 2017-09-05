## Usage

Once installed, you can access blinksocks via CLI:

```
$ blinksocks --help

  Usage: blinksocks [command] [options] ...

  Commands:

    init    generate a pair of json file

  Options:

    -h, --help          output usage information
    -v, --version       output blinksocks version
    -c, --config        file with configuration, usually a json file
    --list-presets      list all built-in presets
    -m, --minimal       generate minimal json files

  Examples:

  - Generate json file with full options
    $ blinksocks init
  - Generate json file with minimal options
    $ blinksocks init --minimal
  - Start blinksocks client
    $ blinksocks --config blinksocks.client.json
  - Start blinksocks server
    $ blinksocks --config blinksocks.server.json

```

`blinksocks init` will generate `blinksocks.client.json` and `blinksocks.server.json` with a random key/port/timeout and default settings.

After init, you should edit `blinksocks.client.json` to tell blinksocks client where is the server:

```
{
  // server host name or ip address
  host: "example.com"
}
```

> You may also want to change default protocol stack(presets) or other settings, please check out [--config](../config) for explanation of every option.

## Run in production

### Using pm2

> NOTE: you can only use pm2 on Linux/macOS due to a bug of pm2 on Windows. [#93](https://github.com/blinksocks/blinksocks/issues/93)

You can take advantages of [pm2](https://github.com/unitech/pm2) to run blinksocks in the production.

Install `pm2` before running blinksocks in the production:

```
$ npm install -g pm2
```

**Daemon mode**

```
$ pm2 start blinksocks -- -c blinksocks.client.json
```

**Cluster mode**

```
$ pm2 start blinksocks -i 2 -- -c blinksocks.server.json
```

### Using node interpreter

```
$ wget https://raw.githubusercontent.com/blinksocks/blinksocks/master/build/blinksocks.js
$ node blinksocks.js
```

### Using executables

```
// download archive
$ wget https://github.com/blinksocks/blinksocks/releases/download/v2.5.3/blinksocks-linux-x64-v2.5.3.gz

// you'd better check sha256sum listed in sha256sum.txt
$ wget https://github.com/blinksocks/blinksocks/releases/download/v2.5.3/sha256sum.txt

// decompress
$ gunzip blinksocks-linux-x64-v2.5.3.gz

// grant executable permission
$ chmod +x blinksocks-linux-x64-v2.5.3

// run directly
$ ./blinksocks-linux-x64-v2.5.3 --help
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
