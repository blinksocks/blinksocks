#!/usr/bin/env node
require('babel-polyfill');
const Hub = require('../lib').Hub;
const Crypto = require('../lib').Crypto;
const bootstrap = require('./bootstrap');

bootstrap({Hub, Crypto});
