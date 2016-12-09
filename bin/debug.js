#!/usr/bin/env node

require('babel-register');
const Hub = require('../src').Hub;
const bootstrap = require('./bootstrap');

bootstrap(Hub);
