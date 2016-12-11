# Protocol

The protocol of blinksocks is similar to [SOCKS5](https://www.ietf.org/rfc/rfc1928.txt), but simpler.

## Requests

### Normal request

The blinksocks normal request is formed as follows:

```
+------+------+----------+----------+----------+
| LEN  | ATYP | DST.ADDR | DST.PORT |   DATA   |
+------+------+----------+----------+----------+  = PAYLOAD
|  2   |  1   | Variable |    2     | Variable |
+------+------+----------+----------+----------+
```

Where:

* LEN   field is the total length of the frame
* ATYP  address type of following address
  * IP V4 address: X'01'
  * DOMAINNAME:    X'03'
  * IP V6 address: X'04'
* DST.ADDR desired destination address
* DST.PORT desired destination port in network octet order
* DATA     the application data

### IV request

The first packet sent from client contains an IV base on the normal request frame:

```
+----------------+------+
|    PAYLOAD     |  IV  |
+----------------+------+
|    Variable    |  16  |
+----------------+------+
```

IV is optional and used for more secure encryption.

## Addressing

Follow [SOCKS5](https://www.ietf.org/rfc/rfc1928.txt).

## Replies

The blinksocks reply is formed as follows:

```
+----------+
|   DATA   |
+----------+
| Variable |
+----------+
```

Where:

* DATA the application data(encrypted)

# Encryption

All data transferred between client and server should be encrypted using a 
specified cipher and a pre-shared key.

The length of cipher key must be satisfied with IV Length:

|   Cipher     |  Key Length |  IV Length  |
|:-------------|:------------|:------------|
| aes-128-ctr  | 16          | 16          |
| aes-192-ctr  | 24          | 16          |
| aes-256-ctr  | 32          | 16          |
| aes-128-cfb  | 16          | 16          |
| aes-192-cfb  | 24          | 16          |
| aes-256-cfb  | 32          | 16          |
