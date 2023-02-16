#!/bin/bash

# Parse the command-line options
while getopts "p:b:i:" opt; do
  case $opt in
    p) serial_port="$OPTARG";;
    b) baud_rate="$OPTARG";;
    i) internet_port="$OPTARG";;
    \?) echo "Usage: $0 -p serial_port -b baud_rate -i internet_port" >&2
       exit 1;;
  esac
done

echo "Starting nodeforwarder.js on port $internet_port with serial port $serial_port at baud rate $baud_rate"

npm install forever -g
sudo forever start nodeforwarder.js $internet_port $serial_port $baud_rate 10000 LOG=YES