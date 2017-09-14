# End-to-End Tests

This directory contains code and data used to test the blinksocks implementation.

> unit tests are located in `src/**/__tests__/*.test.js`.

## Test Directories

| Directory |           Purpose           |
| --------- | --------------------------- |
| tmp       | temporary files             |
| common    | common utilities            |
| presets   | e2e tests for "src/presets" |

## Test Instruction

The following command run all test suites ended with **.test.js** and generate test coverage to `coverage/`. You can open `coverage/lcov-report/index.html` to see detailed coverage report.

```
$ yarn test
```
