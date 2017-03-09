#!/usr/bin/env node
require('babel-polyfill');
const Hub = require('../lib').Hub;
const bootstrap = require('./bootstrap');

bootstrap({Hub});
