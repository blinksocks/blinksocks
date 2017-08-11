#!/usr/bin/env bash

# ./iperf.sh <client_conf> <server_conf> <seconds>

# [iperf -c] <----> [bs_client] <----> [bs_server] <----> [iperf -s]
#                      1081               1082               1083

client_conf=$1
server_conf=$2
seconds=$3

blinksocks -c ${client_conf} > /dev/null &
bs_client_pid=$!

blinksocks -c ${server_conf} > /dev/null &
bs_server_pid=$!

iperf -s -p 1083 &
iperf_pid=$!

sleep 1

iperf -c 127.0.0.1 -p 1081 -t ${seconds}

# Wait for iperf server to receive all data.
# One second should be enough in most cases.
sleep 1

kill -SIGINT ${bs_client_pid}
kill -SIGINT ${bs_server_pid}
kill ${iperf_pid}

sleep 1
echo "Test Finished"
