# Preparation

## Get source code

```
$ git clone https://github.com/blinksocks/blinksocks
```

## Install dependencies

```
$ cd blinksocks && npm install
```

## Start blinksocks

Before start blinksocks, you should prepare two configurations(**blinksocks.client.json** and **blinksocks.server.json**) in the **project root folder**.

### Debug Mode(Use Chrome Developer Tool)

Debug in Chrome requires Node.js v6.x and Chrome 57 or later.

```
$ npm run debug:client
$ npm run debug:server
```

Then open **chrome://inspect/#devices**, configure **Target discovery settings** then click **inspect** below **Remote Target**.

### Production Mode

First compile **src** to **lib**:

```
$ npm run compile
```

Then run:

```
$ npm run client
$ npm run server
```

## Unit Test & e2e Test

You should run unit test and e2e test as following and make sure all tests pass before `git commit`:

```
$ npm run test
```

## Publish

For production use, we are running our code under `lib` not `src`, so compilation is necessary.

Compilation of blinksocks is ultra easy:

```
$ npm run compile
```

After compile, we can change version in `package.json` then publish a package to npm registry:

```
$ npm publish
```

## Package

For users don't have Node.js installed, we use [zeit/pkg](https://github.com/zeit/pkg) to prepare compiled executables:

```
$ npm run pkg
```

This will generate compressed executables for different platforms named `blinksocks-{platform}-${arch}-${version}.gz`. And can be distribute to target platform at once.
