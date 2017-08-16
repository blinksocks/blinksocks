# Configuration

## Auto Generate Configs

You can use the following command to generate `blinksocks.client.json` and `blinksocks.server.json`:

```
$ blinksocks init
```

|        KEY         |             DESCRIPTION             | OPTIONAL |     DEFAULT     |                          REMARKS                           |
| :----------------- | :---------------------------------- | :------- | :-------------- | :--------------------------------------------------------- |
| host               | local hostname or ip address        | -        | -               | -                                                          |
| port               | local port                          | -        | -               | -                                                          |
| transport          | the transport layer, "tcp" or "udp" | Yes      | "tcp"           | this option is reserved to "tcp" only                      |
| servers            | a list of server                    | Yes      | -               | [CLIENT ONLY]                                              |
| servers[i].enabled | allow to use this server or not     | -        | -               | -                                                          |
| servers[i].host    | server hostname or ip address       | -        | -               | -                                                          |
| servers[i].port    | server port                         | -        | -               | -                                                          |
| servers[i].key     | server key for encryption           | -        | -               | -                                                          |
| presets            | preset list in order                | -        | -               | -                                                          |
| presets[i].name    | preset name                         | -        | -               | see [presets]                                              |
| presets[i].params  | preset params                       | -        | -               | see [presets]                                              |
| timeout            | timeout for each connection         | Yes      | 600             | in seconds                                                 |
| workers            | the number of sub-process           | Yes      | 0               | cluster mode when workers > 0                              |
| redirect           | a "host:port" format address        | Yes      | ""              | [SERVER ONLY], where to redirect traffic(when preset fail) |
| dns                | an ip list of DNS server            | Yes      | []              | -                                                          |
| dns_expire         | DNS cache expiration time           | Yes      | 3600            | in seconds                                                 |
| log_path           | log file path                       | Yes      | "bs-[type].log" | a directory or a file                                      |
| log_level          | log level                           | Yes      | "info"          | ['error', 'warn', 'info', 'verbose', 'debug', 'silly']     |

### Servers(Client Side Only)

`servers` is a list of blinksocks/shadowsocks servers. Each server consist of `enabled`, `host`, `port`, `key` and `presets`.

You can temporary disable a server by setting `enabled: false`.

Blinksocks will detect which server is the fastest in intervals using [balancer.js].

### Presets

`presets` is a list of procedures, each preset is defined as:

```json
{
  "name": "preset-name",
  "params": {
    "key": "value"
  }
}
```

`presets` are chaining from the first to the last, and are almost free to compose.

For more information about presets, please check out [presets].

### Log Path

Specify a relative or absolute path to store log file, if no `log_path` provided, log file named `bs-[type].log` will be stored in the working directory.

### Log Levels

The logging library [winston] use npm logging levels by default, you can choose one of them demand:

```
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
```

### Redirect(Server Side Only)

You can specify a `redirect` location to tell blinksocks **server** where to relay unexpected data received
from client.

`redirect` must either be formed with `ip:port` or `hostname:port`. For example:

```
{
  ...
  "redirect": "localhost:80"
  ...
}
```

If `redirect` is not provided, connection will be closed after random seconds when server fail to process.

### Custom DNS servers

If you encounter **ENOTFOUND** every now and then, you would better custom dns servers via `dns` options:

```
{
  ...
  "dns": ["8.8.8.8"]
  ...
}
```

If no `dns` option or no ip provided in `dns`, blinksocks use system dns settings as usual.

See: https://github.com/blinksocks/blinksocks/issues/66

### Cluster Mode

You can enable cluster mode by setting `workers` greater than zero, cluster mode can take advantage of multi-core systems to handle the load.

`workers` is usually set to the number of cpu cores:

```
{
  ...
  "workers": 2
  ...
}
```

## Run blinksocks

To start a server or a client, you prepare a json or js file first, then supply it to `--config` or `-c`:

```
$ blinksocks -c blinksocks.client.json
```

[balancer.js]: ../../src/core/balancer.js
[presets]: ../presets
[winston]: https://github.com/winstonjs/winston
