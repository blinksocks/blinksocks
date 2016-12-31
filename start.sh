#!/usr/bin/env bash

CONFIG_FILE=/blinksocks/server.config.json
RANDOM_PASSWORD=`pwgen -cyn -1 16`

echo ">>> Generated random password: ${RANDOM_PASSWORD}"
sed -i -e"s/^\"password\".*:.*/\"password\": \"${RANDOM_PASSWORD}\"/" ${CONFIG_FILE}

echo ">>> Running blinksocks with ${CONFIG_FILE}"
blinksocks -c ${CONFIG_FILE}
