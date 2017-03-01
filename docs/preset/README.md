# Protocol

The protocol of blinksocks is similar to [SOCKS5](https://www.ietf.org/rfc/rfc1928.txt), but simpler.

```
                                              TCP handshake (AEAD-MIXED)
 (Optional)
+-----------+-----------------------------------------------------------------------------------------+
| obfs.DATA |                                         PAYLOAD                                         |
+-----------+-----------------------------------------------------------------------------------------+ <-------+
| Variable  |                                         Variable                                        |         |
+-----------+-----------------------------------------------------------------------------------------+         |
                                                                                                         ObfsMiddleware(*)
            +---------+-----+--------+-----------+----------------------------------------+-----------+         |
            |  NONCE  | LEN |   IV   | HMAC-MD5  |                PAYLOAD                 | HMAC-MD5  |         |
            +---------+-----+--------+-----------+----------------------------------------+-----------+ <-------+
            |   12    |  2  |   16   |    16     |                Variable                |    16     |         |
            +---------+-----+--------+-----------+----------------------------------------+-----------+         |
            |<---- (AES-128-CBC) --->|                                                                   ProtocolMiddleware(*)
                                                 +----------------------------------------+                     |
                                                 |                PAYLOAD                 |                     |
                                                 +----------------------------------------+ <-------------------+
                                                 |                Variable                |                     |
                                                 +----------------------------------------+                     |
                                                 |<------ (user specified cipher) ------->|                     |
                                                                                                         CryptoMiddleware
                                                 +------+----------+----------+-----------+                     |
                                                 | ATYP | DST.ADDR | DST.PORT |  PAYLOAD  |                     |
                                                 +------+----------+----------+-----------+ <-------------------+
                                                 |  1   | Variable |    2     |  Variable |                     |
                                                 +------+----------+----------+-----------+                     |
                                                                                                         FrameMiddleware
                                                                              +-----------+                     |
                                                                              |   DATA    |                     |
                                                      Application Data -----> +-----------+ --------------------+
                                                                              |  Variable |
                                                                              +-----------+

                           TCP handshake (BASIC)
 (Optional)
+-----------+-------------------------------------------------------+
| obfs.DATA |                     PAYLOAD                           |
+-----------+-------------------------------------------------------+ <-------+
| Variable  |                     Variable                          |         |
+-----------+-------------------------------------------------------+         |
                                                                        ObfsMiddleware(*)
            +-----+--------+----------------------------------------+         |
            | LEN |   IV   |                PAYLOAD                 |         |
            +-----+--------+----------------------------------------+ <-------+
            |  2  |   16   |                Variable                |         |
            +-----+--------+----------------------------------------+         |
            |<--cipherA--->|                                            ProtocolMiddleware(*)
                           +----------------------------------------+         |
                           |                PAYLOAD                 |         |
                           +----------------------------------------+ <-------+
                           |                Variable                |         |
                           +----------------------------------------+         |
                           |<------ (user specified cipherA) ------>|         |
                                                                        CryptoMiddleware
                           +------+----------+----------+-----------+         |
                           | ATYP | DST.ADDR | DST.PORT |  PAYLOAD  |         |
                           +------+----------+----------+-----------+ <-------+
                           |  1   | Variable |    2     |  Variable |         |
                           +------+----------+----------+-----------+         |
                                                                        FrameMiddleware
                                                        +-----------+         |
                                                        |   DATA    |         |
                                Application Data -----> +-----------+ --------+
                                                        |  Variable |
                                                        +-----------+

TCP chunk:

 (Optional)
+-----------+---------------------+
| obfs.DATA |     obfs.PAYLOAD    |
+-----------+---------------------+
| Variable  |      Variable       |
+-----------+---------------------+
                      ||
                ObfsMiddleware
                      ||
            +---------------------+
            |     crypto.DATA     |
            +---------------------+
            |      Variable       |
            +---------------------+
                      ||
               CryptoMiddleware
                      ||
            +---------------------+
            |  protocol.PAYLOAD   |
            +---------------------+
            |      Variable       |
            +---------------------+
                      ||
              ProtocolMiddleware
                      ||
            +---------------------+
            |        DATA         |
            +---------------------+
            |       Variable      |
            +---------------------+
```

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

* LEN   the total length of the frame
* ATYP  address type of following address
  * IP V4 address: X'01'
  * DOMAINNAME:    X'03'
  * IP V6 address: X'04'
* DST.ADDR desired destination address
* DST.PORT desired destination port in network octet order
* DATA     the application data

### IV request

The **first packet** sent from client contains an IV base on the normal request frame:

```
+----------------+-------+
|    PAYLOAD     |  IV   |
+----------------+-------+
|    Variable    | Fixed |
+----------------+-------+
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

All data transferred between client and server shall be encrypted using:

1. specified cipher - defined in config.json
2. a pre-shared key - defined in config.json
3. initialization vector(IV) - auto-generate

All of them are **optional**. `IV` is always generated for each connection 
no matter it's **TCP** or **UDP**.

## Non-Encryption mode

For **development** or **special cases**, you can turn on non-encryption mode by setting 
`cipher` option to an empty string.

## Supported Ciphers

The length of cipher key must be satisfied with IV Length:

|   Cipher     |  Key Length |  IV Length  |
|:-------------|:------------|:------------|
| aes-128-ctr  | 16          | 16          |
| aes-192-ctr  | 24          | 16          |
| aes-256-ctr  | 32          | 16          |
| aes-128-cfb  | 16          | 16          |
| aes-192-cfb  | 24          | 16          |
| aes-256-cfb  | 32          | 16          |
