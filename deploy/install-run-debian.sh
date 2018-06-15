#!/usr/bin/env bash

curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs

npm install --global pm2 blinksocks

echo "$ node --version"
node --version

echo "$ npm --version"
npm --version

echo "$ blinksocks --version"
blinksocks --version

echo "$ blinksocks init"
blinksocks init

echo "$ pm2 start blinksocks -- --config blinksocks.server.json"
pm2 start blinksocks -- --config blinksocks.server.json

echo "$ cat blinksocks.server.json"
cat blinksocks.server.json
echo ""
