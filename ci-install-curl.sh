#!/usr/bin/env bash

# Install any build dependencies needed for curl
sudo apt-get build-dep curl

# Get latest curl
wget http://curl.haxx.se/download/curl-7.54.0.tar.bz2
tar -xvjf curl-7.54.0.tar.bz2
cd curl-7.54.0
./configure
make
sudo make install

# Resolve any issues of C-level lib
# location caches ("shared library cache")
sudo ldconfig
cd ..
