# Configuration

## Auto Generate Configs

You can use the following command to generate `blinksocks.client.json` and `blinksocks.server.json`:

```
$ blinksocks init
```

|         KEY          |             DESCRIPTION             | OPTIONAL |     DEFAULT     |                        REMARKS                         |
| :------------------- | :---------------------------------- | :------- | :-------------- | :----------------------------------------------------- |
| host                 | local hostname or ip address        | -        | -               | -                                                      |
| port                 | local port                          | -        | -               | -                                                      |
| transport            | the transport layer, "tcp" or "udp" | Yes      | "tcp"           | this option is reserved to "tcp" only                  |
| servers              | a list of server                    | Yes      | -               | [CLIENT SIDE ONLY]                                     |
| servers[i].enabled   | allow to use this server or not     | -        | -               | -                                                      |
| servers[i].host      | server hostname or ip address       | -        | -               | -                                                      |
| servers[i].port      | server port                         | -        | -               | -                                                      |
| servers[i].key       | server key for encryption           | -        | -               | -                                                      |
| presets              | preset list in order                | -        | -               | see [presets]                                          |
| presets[i].name      | preset name                         | -        | -               | -                                                      |
| presets[i].params    | preset params                       | -        | -               | -                                                      |
| behaviours           | a list of behaviours                | Yes      | -               | see [behaviours]                                       |
| behaviours[i].name   | behaviour name                      | -        | -               | -                                                      |
| behaviours[i].params | behaviour params                    | -        | -               | -                                                      |
| timeout              | timeout for each connection         | Yes      | 600             | in seconds                                             |
| workers              | the number of sub-process           | Yes      | 0               | cluster mode when workers > 0                          |
| dns                  | an ip list of DNS server            | Yes      | []              | -                                                      |
| dns_expire           | DNS cache expiration time           | Yes      | 3600            | in seconds                                             |
| log_path             | log file path                       | Yes      | "bs-[type].log" | a directory or a file                                  |
| log_level            | log level                           | Yes      | "info"          | ['error', 'warn', 'info', 'verbose', 'debug', 'silly'] |

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

### Behaviours

Behaviours are customizable event handlers for Relay. `behaviours` is an object with several "events" which may occured in Socket.

You can specify a behaviour to different events using different handlers. The following config shows when any preset failed, socket should close the connection in a random timeout picked from 10 to 40 seconds:

```json
{
  "behaviours": {
    "on-preset-failed": {
      "name": "random-timeout",
      "params": {
        "min": 10,
        "max": 40
      }
    }
  },
}
```

For more information about behaviours, please check out [behaviours].

### Log Path

Specify a relative or absolute path to store log file, if no `log_path` provided, log file named `bs-[type].log` will be stored in the working directory.

### Log Levels

The logging library [winston] use npm logging levels by default, you can choose one of them demand:

```
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
```

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
[behaviours]: ../behaviours
[winston]: https://github.com/winstonjs/winston
