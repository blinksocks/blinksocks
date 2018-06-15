# obfs-random-padding

`obfs-random-padding` provides ability to prevent traffic analysis(based on sequence of round trip packet length between client and server):

## To prevent traffic analysis

```
"presets": [
  {"name": "ss-base"},
  {"name": "obfs-random-padding"},
  {"name": "ss-stream-cipher","params": {"method": "aes-128-ctr"}}
]
```

## To prevent traffic analysis and ensure integrity as well

```
"presets": [
  {"name": "ss-base"},
  {"name": "obfs-random-padding"},
  {"name": "ss-aead-cipher","params": {"method": "aes-128-gcm"}}
]
```
