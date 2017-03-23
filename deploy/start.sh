#!/usr/bin/env bash

RANDOM_KEY=`pwgen --capitalize --numerals -1 16`

cd /blinksocks

echo ">>> Generating random key..."
sed -i -e"s/\"key\": \".*\"/\"key\": \"${RANDOM_KEY}\"/"  blinksocks.config.json

pm2 start pm2.config.json
