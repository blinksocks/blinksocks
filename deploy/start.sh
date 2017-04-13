#!/usr/bin/env bash

cd /blinksocks && blinksocks init && pm2 start pm2.config.json --env production
