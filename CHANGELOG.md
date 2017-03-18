
v2.2.2 / 2017-03-18
===================

  * chore(package): add script to auto generate changelog
  * chore(): add AUTHORS and CHANGELOG.md
  * chore(package): bump version to v2.2.2
  * chore(lib): update
  * chore(package): update yarn.lock
  * Merge branch 'greenkeeper-babel-preset-env-1.2.2'
  * Merge branch 'greenkeeper-eslint-3.18.0'
  * chore(gitignore): more robust
  * fix(protocol): log
  * fix(socket): prevent "Error: This socket is closed" when send data
  * chore(socket): verbose log connection errors
  * chore(protocol): turn logger.info to logger.verbose
  * refactor(profile): grouped fields into four parts, profile.log now has a date postfix
  * fix(core): this.onForward is undefined when perform http proxy
  * chore(package): update eslint to version 3.18.0
  * docs(): add performance
  * docs(readme): update
  * fix(bootstrap): log_level is invalid when only use --config
  * chore(package): update babel-preset-env to version 1.2.2

v2.2.2 / 2017-03-18
===================

  * chore(package): bump version to v2.2.2
  * chore(lib): update
  * chore(package): update yarn.lock
  * chore(gitignore): more robust
  * fix(protocol): log
  * fix(socket): prevent "Error: This socket is closed" when send data
  * chore(socket): verbose log connection errors
  * chore(protocol): turn logger.info to logger.verbose
  * refactor(profile): grouped fields into four parts, profile.log now has a date postfix
  * fix(core): this.onForward is undefined when perform http proxy
  * chore(package): update eslint to version 3.18.0
  * docs(): add performance
  * docs(readme): update
  * fix(bootstrap): log_level is invalid when only use --config
  * chore(package): update babel-preset-env to version 1.2.2

v2.2.1 / 2017-03-15
===================

  * chore(package): bump version to v2.2.1
  * docs(readme): add description for "--profile"
  * chore(lib): update
  * chore(core): make use of profiler
  * feat(bootstrap): add --profile option
  * feat(core): add profile.js
  * chore(gitignore): ignore blinksocks log
  * refactor(socket): extract client proxy stuff to client-proxy.js
  * chore(package): update
  * feat(bin): implemented "blinksocks init"
  * chore(config): remove

v2.2.0-beta.5 / 2017-03-10
==========================

  * chore(package): bump version to v2.2.0-beta.5
  * chore(core): more clear log
  * docs(README): add docs for multi-server mode
  * chore(lib): update
  * chore(package): replace babel-preset-latest to babel-preset-env
  * chore(balancer): do not query when there is only one server in the list
  * refactor(balancer): pass array of object to init()
  * chore(hub): more log for balancer
  * feat(core): multi-server now available
  * feat(bin): add 'blinksocks-init' and 'blinksocks-run' sub commands
  * fix(hub): eslint
  * fix(hub): should limit the nextId growth
  * chore(socket): change log level to info when socket closed
  * chore(lib): update
  * chore(architcture): add docs for 'fail' callback
  * feat(middleware): add 'fail' callback to handle fatal error of presets
  * fix(hub): should always log when service startup no matter what log_level is
  * feat(utils): add getRandomInt(min, max)
  * fix(deploy): missing '--' in pm2 start command
  * docs(README): update
  * chore(presets/protocol): better log in aead.js
  * feat(presets/protocol): add aead v2
  * docs(README): update

v2.2.0-beta.4 / 2017-03-05
==========================

  * chore(package): bump version to v2.2.0-beta.4
  * chore(lib): update
  * fix(presets/protocol): should not drop buffer if it too short to calc HMAC, should continue to receive
  * refactor(utils): toBytesBE -> numberToUIntBE, hostToAddress -> parseURI
  * refactor(presets/frame): deprecate pack() and unpack()
  * refactor(socket): pass target address by parameters, not by class member
  * docs(src): more comments
  * refactor(dns-cache): do not cache if it was an ip already
  * chore(address): deprecate address.js, use simple object instead
  * chore(package): update ip and eslint
  * feat(config): add abstract() to display running configuration
  * chore(cli): update
  * chore(package): eslint now will lint bin/*
  * refactor(utils): deprecate crypto.js, presets now can implement their own crypto logic without limit
  * docs(README): fix docker badge
  * chore(lib): update
  * chore(package): update husky
  * fix(aead): aead now will encrypt payload then mac
  * fix(config): the default value of protocol is 'aead'
  * docs(README): fix docker badge
  * chore(lib): update
  * chore(package): upgrade yarn.lock

v2.2.0-beta.3 / 2017-03-02
==========================

  * chore(package): bump version to v2.2.0-beta.3
  * chore(lib): update
  * fix(basic): should not split buffer into chunks
  * fix(aead): should not split buffer into chunks
  * chore(package): deprecate lodash.chunk
  * chore(utils): toBytesBE(), throw an error when the number is out of range

v2.2.0-beta.2 / 2017-03-02
==========================

  * chore(package): bump version to v2.2.0-beta.2
  * fix(deploy): update start.sh to use new configuration
  * chore(package): bump version to v2.1.0-beta.1
  * chore(.babelrc): reformat
  * chore(package): update eslint-plugin-babel
  * chore(lib): update
  * docs(README): add instruction for available ciphers, hashes, presets and log levels
  * feat(presets/protocol): add basic preset
  * refactor(presets/protocol): remove redundant code in aead preset
  * fix(middleware): use logger.error instead of fatal
  * chore(config): check protocol is set or not
  * chore(presets/protocol): deprecate none preset
  * docs(architecture): fix typo
  * docs(*): update architecture and middleware
  * chore(.gitignore): ignore .vscode
  * docs(architecture): fix typo
  * docs(*): update architecture/ and README
  * docs(architecture): update
  * docs(README): update
  * chore(bootstrap): update cli options
  * docs(README): update
  * chore(lib): add
  * docs(README): update
  * docs(): pushed but need to update later
  * chore(config): minor change
  * chore(presets): log error rather than throw it
  * test(config): fix
  * chore(*): deprecate log4js, use winston instead
  * chore(cli): add --frame and --frame-params options
  * refactor(utils): replace numberToArray to Buffer powered function
  * feat(advanced-buffer): return -1 in getPacketLength() can drop the cached buffer
  * docs(presets): update
  * feat(presets): add frame preset, allow to custom the lowest frame
  * chore(package): add lodash.chunk
  * refactor(middlewares): deprecate individual middlewares use createMiddleware() to create
  * chore(babelrc): remove comments in output files
  * chore(package): prevent to compile tests file
  * chore(config): update examples
  * refactor(bootstrap): support new interfaces
  * refactor(dns-cache): do no throw in get()
  * chore(src): expose modules in middlewares and utils
  * feat(crypto): add getAvailableCiphers() and getAvailableHashes()
  * chore(crypto): deprecate md5 and sha
  * fix(CI): filename is case-sensetive
  * test(utils): add tests for advanced-buffer, crypto, logger and utils
  * test(core): add tests for address, config and dns-cache
  * feat(middlewares,presets): add obfs, protocol, crypto middlewares and implementations
  * chore(core): remove and rename some files
  * chore(package): update deps
  * chore(package): require node version greater than 6
  * chore(deploy): use node:6.10.0-slim
  * chore(CI): use node_js:6.10.0
  * chore(lib): remove
  * chore(eslint): turn off no-undef and max-len check rules
  * chore(CI): use node_js:6.9.5
  * chore(deploy): use node:6.9.5-slim
  * chore(package): add keywords
  * chore(package): update deps
  * fix(obfs): http obfs
  * feat(obfs): now can specify obfuscation times per socket for 'http' obfs
  * refactor(Pipe): do more things, simplify Socket, use only one pipe
  * refactor(Relay): deprecate
  * feat(obfs): implemented http obfs
  * refactor(utils): Utils -> utils
  * fix(core): eslint
  * chore(lib): update
  * chore(presets): add obfs presets and fix protocol presets
  * refactor(Socket): now it is middleware based
  * feat(Middlewares): add ObfsMiddleware
  * fix(Middlewares): ProtocolMiddleware now will prepend LEN
  * refactor(Config): add protocol, protocol_params, obfs and obfs_params
  * refactor(*): use Logger more simple
  * feat(presets): add presets for protocol and obfs middleware
  * feat(core): add Pipe
  * feat(core): add several middlewares
  * docs(README): add upgrade instruction
  * chore(core): Encapsulator, Frame, Tracer
  * fix(test): module importing
  * chore(package): update deps
  * chore(): backup project
  * refactor(protocols): rename to proxies
  * fix(core): socket maybe null when TcpRelay.onClose()
  * chore(package): update deps
  * chore(package): update deps
  * chore(eslint): turn off object-curly-spacing checking
  * docs(README): update roadmap
  * chore(package): update eslint-config-babel to version 5.0.0
  * docs(README): add description for production use case
  * chore(deploy): use pm2 to run blinksocks
  * chore(ci): use node_js v6.9.4
  * chore(README): add docker badge

v2.1.0-beta.3 / 2017-01-11
==========================

  * chore(package): bump version to 2.1.0-beta.3
  * docs(README): update ## Test
  * chore(package): update deps
  * docs(): update README.md and architecture.md
  * feat(protocol): support for socks4a
  * chore(package): bump version to 2.1.0-beta.2

v2.1.0-beta.2 / 2017-01-10
==========================

  * docs(README): add features, roadmap, and references
  * fix(core): imports from common
  * feat(protocol): support for socks4
  * chore(lib): update
  * test(socks5): add test for UdpRequestMessage
  * refactor(src): rename classes to core, move protocol relatives to protocols/
  * chore(lib): update
  * fix(classes): try to fix memory leak
  * chore(DNSCache): use log4js to log
  * fix(deploy): host bind issue on CentOS
  * docker(deploy): use node:6.9.4-slim

v2.1.0-beta.1 / 2017-01-07
==========================

  * chore(package): bump version to 2.1.0-beta.1
  * docs(README): update readme and architecture
  * chore(package): update deps
  * chore(lib): update
  * fix(test): add spec to test invalid http message
  * fix(deploy): should bind 'localhost' in container
  * fix(http): switch between Socks5 and HTTP can cause TypeError
  * chore(lib): update
  * docs(README): update
  * feat(http): implemented proxy for http
  * feat(classes): add Utils.js, move helper functions to Utils
  * chore(socks5): fix imports
  * chore(package): add 'ip' dependency
  * refactor(socks5): move Message.js to src/common/
  * docs(README): update
  * chore(deploy): use node:6.9.2-slim
  * fix(deploy): /start.sh: line 12: /blinksocks/server.config.json: No such file or directory
  * docs(README): update

v2.0.0 / 2017-01-02
===================

  * chore(package): v2.0.0 released
  * feat(bin): add more cmd options
  * docs(README): update
  * chore(License): update copyright to 2017
  * docs(README): update
  * fix(Config): log4js problem

v2.0.0-beta.5 / 2017-01-01
==========================

  * fix(Config): test failed when use dateFile appender of log4js
  * refactor(): rename examples to config
  * fix(Config): log4js configuration problem
  * fix(package): use yarnpkg registry instead of taobao
  * refactor(): move *.config.json to examples/*
  * refactor(deploy): generate config file in start.sh
  * chore(deploy): display config file to stdout
  * feat(deploy): add Docker stuff
  * chore(): add example configuration file
  * chore(package): update deps
  * chore(package): update deps
  * docs(README): add a new plan to v2
  * chore(package): update deps
  * chore(package): update yarn.lock
  * chore(package): update husky to version 0.12.0

v2.0.0-beta.4 / 2016-12-14
==========================

  * chore(lib): update pre-compiled
  * docs(spec): update
  * docs(README): add features section
  * feat(UdpRelay): implemented relay for UDP
  * refactor(*): rename Connection -> Address, Relay -> TcpRelay
  * fix(Connection): ipv6 problem

v2.0.0-beta.3 / 2016-12-13
==========================

  * docs(architecture): add docs for DNSCache
  * test(Connection): fix ipv6 problem
  * chore(lib): update pre-compiled
  * feat(DNSCache): dns cache now available
  * chore(package): update deps
  * chore(package): add babel-polyfill to dependencies

v2.0.0-beta.2 / 2016-12-11
==========================

  * chore(lib): update pre-compiled
  * test(*): add tests for Config, Crypto
  * feat(*): innitialization vector for encryption/decryption
  * refactor(bin): should list supported ciphers via Crypto
  * chore(package): update
  * docs(): add spec

v2.0.0-beta.1 / 2016-12-11
==========================

  * feat(*): implemented streaming data encryption/decryption
  * docs(architecture): update
  * chore(package): update deps
  * docs(README): add explation for configuration options
  * fix(README): a mistake of yarn installation
  * docs(README): update shields badges
  * chore(coverage): add badge to show test coverage
  * chore(Config): remove useless 'level' option in log4js.configure
  * refactor(Relay): more semantic
  * docs(README): update
  * chore(.gitignore): ignore *.config.json
  * docs(README): update shields icons
  * docs(README): update roadmap
  * chore(travis): use node v6.9.2 LTS
  * chore(travis): use node v6
  * chore(bootstrap): version number should follow package.json

v1.0.1 / 2016-12-09
===================

  * chore(package): v1.0.1
  * chore(index): remove index.js
  * chore(.gitignore): ignore debug/
  * initial commit
