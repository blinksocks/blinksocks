# Behaviours

Behaviours are customizable event handlers for Socket layer. You can specify a behaviour to different events using different handlers:

```
{
  "behaviours": {
    "[event]": {
      "name": "[behaviour-name]",
      "params": {
        [behaviour-params]
      }
    }
  },
}
```

**Supported Events:**

|      EVENT       |       WHEN        |
| :--------------- | :---------------- |
| on-preset-failed | any preset failed |

## [direct-close]

Socket should close the connection immediately.

```json
{
  "name": "direct-close"
}
```

## [random-timeout]

Socket should close the connection in a random timeout.

| PARAMS |     DESCRIPTION     | DEFAULT |
| :----- | :------------------ | :------ |
| min    | the minimal timeout | 10      |
| max    | the maximal timeout | 40      |

```json
{
  "name": "random-timeout",
  "params": {
    "min": 10,
    "max": 40
  }
}
```

## [redirect]

Socket should redirect data stream to a permanent destination.

| PARAMS |     DESCRIPTION      | DEFAULT |
| :----- | :------------------- | :------ |
| host   | the destination host | -       |
| port   | the destination port | -       |

```json
{
  "name": "redirect",
  "params": {
    "host": "my-log-server",
    "port": 80
  }
}
```

[direct-close]: ../../src/behaviours/direct-close.js
[random-timeout]: ../../src/behaviours/random-timeout.js
[redirect]: ../../src/behaviours/redirect.js
