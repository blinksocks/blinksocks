#!/usr/bin/env node
const Hub = require('../lib').Hub;
const Crypto = require('../lib').Crypto;
const bootstrap = require('./bootstrap');

bootstrap({Hub, Crypto});
