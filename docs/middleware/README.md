# Plugins

Blinksocks supports plugin system, this makes blinksocks more flexible and security.

There are two kinds of plugins in the blinksocks:

* Protocol Plugin
* Obfuscation Plugin

## Procedure

Application data <--> `Protocol Plugin` <--> `Obfuscation Plugin` <--> Data Frame(transfer on the network).

## Protocol Plugin

Protocol plugin combines application data with additional headers, forming particular frame.

There are several built-in protocol plugins:

* `none`

Do not add any headers to the application data.

* `basic`

Use AES to ensure confidentiality.

* `aead-gcm`(**Recommended**)

Use AES and HMAC to ensure confidentiality, integrity and authentication.
`md5` and `sha1` are algorithms applied for HMAC.

## Obfuscation Plugin

After protocol plugin created data frames, cheat plugin wrap the output of
protocol plugins, disguising a particular protocol such as HTTP or TLS packages,
rather than an unknown protocol to attackers.

There are several built-in Obfuscation plugins:

* `none`, do not wrap output data of protocol plugin
* `http`, make the handshake packet looks like a http GET/POST request
