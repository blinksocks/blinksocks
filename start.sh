#!/usr/bin/env bash

CONFIG_FILE=/blinksocks/server.config.json
BIND_HOST="0.0.0.0"
BIND_PORT=1080
RANDOM_KEY=`pwgen --capitalize --numerals -1 16`
FRAME="origin"
FRAME_PARAMS=""
CRYPTO="openssl"
CRYPTO_PARAMS="aes-256-cbc"
PROTOCOL="aead"
PROTOCOL_PARAMS="aes-128-cbc,sha256"
OBFS=""
OBFS_PARAMS=""
LOG_LEVEL="error"

mkdir -p /blinksocks && touch ${CONFIG_FILE}

echo ">>> Generated configuration with random key..."
cat <<-EOF > ${CONFIG_FILE}
{
  "host": "${BIND_HOST}",
  "port": ${BIND_PORT},
  "key": "${RANDOM_KEY}",
  "frame": "${FRAME}",
  "frame_params": "${FRAME_PARAMS}",
  "crypto": "${CRYPTO}",
  "crypto_params": "${CRYPTO_PARAMS}",
  "protocol": "${PROTOCOL}",
  "protocol_params": "${PROTOCOL_PARAMS}",
  "obfs": "${OBFS}",
  "obfs_params": "${OBFS_PARAMS}",
  "log_level": "${LOG_LEVEL}"
}
EOF

echo ">>> Using ${CONFIG_FILE}..."
cat ${CONFIG_FILE}

echo ">>> Running blinksocks with ${CONFIG_FILE}"
pm2 start blinksocks -i 3 --config ${CONFIG_FILE}
