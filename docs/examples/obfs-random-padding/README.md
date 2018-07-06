# obfs-random-padding

`obfs-random-padding` provides ability to prevent traffic analysis(based on sequence of round trip packet length between client and server):

**without random padding**

```
↑20 ↓18 ↑22 ↓544 ↓1400 ↓1400 ...
```

**with random padding**

```
↑230 ↓28 ↑522 ↓545 ↓1400 ↓1400 ...
```

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
