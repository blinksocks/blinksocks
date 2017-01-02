#!/usr/bin/env bash

CONFIG_FILE=/blinksocks/server.config.json
BIND_HOST="0.0.0.0"
BIND_PORT=1080
RANDOM_PASSWORD=`pwgen -cyn -1 16`
DEFAULT_CIPHER="aes-256-cfb"
USE_IV="true"
LOG_LEVEL="error"

mkdir -p /blinksocks && touch ${CONFIG_FILE}

echo ">>> Generated random password..."
cat <<-EOF > ${CONFIG_FILE}
{
  "host": "${BIND_HOST}",
  "port": ${BIND_PORT},
  "password": "${RANDOM_PASSWORD}",
  "cipher": "${DEFAULT_CIPHER}",
  "use_iv": ${USE_IV},
  "log_level": "${LOG_LEVEL}"
}
EOF

echo ">>> Using ${CONFIG_FILE}..."
cat ${CONFIG_FILE}
echo ""

echo ">>> Running blinksocks with ${CONFIG_FILE}"
blinksocks --config ${CONFIG_FILE}
