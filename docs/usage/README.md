## Usage

Once installed, you can access blinksocks via CLI:

```
$ blinksocks --help

  blinksocks v2.9.0

  Usage: blinksocks [command] [options] ...

  Commands:

    init    generate configuration pair

  Options:

    -h, --help          output usage information
    -v, --version       output blinksocks version
    -c, --config        file json file with configuration
    -m, --minimal       generate minimal json files
    -w, --write         overwrite previous json files
    --list-presets      list all built-in presets

  Examples:

  - Generate json file with minimal options
    $ blinksocks init --minimal
  - Start blinksocks client
    $ blinksocks --config blinksocks.client.json
  - Start blinksocks server
    $ blinksocks --config blinksocks.server.json
  - List all built-in presets
    $ blinksocks --list-presets

  About & Help: https://github.com/blinksocks/blinksocks

```

`blinksocks init` will generate `blinksocks.client.json` and `blinksocks.server.json` with some random and default settings.

After init, you should edit `blinksocks.client.json` to tell blinksocks client where is the server:

```
{
  "server": {
    "service": "tcp://<server_address>:<server_port>",
    ...
  }
}
```

You can also check out [Configuration](../config) for explanation of every option.

## Run in production

### Using pm2

> NOTE: you can only use pm2 on Linux/macOS due to a bug of pm2 on Windows. [#93](https://github.com/blinksocks/blinksocks/issues/93)

You can take advantages of [pm2](https://github.com/unitech/pm2) to run blinksocks in production.

Install `pm2` before running blinksocks in production:

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

### Using systemd

If you want to deploy a service on **Linux**, you can make use of systemd.

1. Create a system service under `/etc/systemd/system/`.

```
# vim /etc/systemd/system/blinksocks.service
```

```
[Unit]
Description=blinksocks
After=network.target
Wants=network.target

[Service]
ExecStart=/usr/bin/blinksocks /root/blinksocks.server.json
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

> NOTE: Assume that your configuration for blinksocks is located at `/root/blinksocks.server.json`.

2. Refresh services then start blinksocks.

```
# systemctl daemon-reload
# systemctl start blinksocks
```

3. If not successful, checkout startup logs.

```
# journalctl -u blinksocks.service
```

### Using executables

```
// download archive from releases page
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

## Work with browsers

Most of the time, you are surfing the Internet via web browsers such as Firefox or Google Chrome.

You can now make use of [SwitchyOmega](https://github.com/FelisCatus/SwitchyOmega) to proxy your connections by rules to blinksocks via socks5/socks4(a)/http protocols.

For FireFox, you can also configure proxy in `Preferences - Advanced - Network - Settings`.
