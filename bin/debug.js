#!/usr/bin/env node
require('babel-register');
const Hub = require('../src').Hub;
const Crypto = require('../src').Crypto;
const bootstrap = require('./bootstrap');

bootstrap({Hub, Crypto});
