#!/bin/bash
# Start script that runs both expo and proxy server

# Start expo on port 19006 in background
echo "Starting Expo on port 19006..."
yarn expo start --tunnel --port 19006 &
EXPO_PID=$!

# Wait for expo to start
sleep 10

# Start proxy server on port 3000
echo "Starting proxy server on port 3000..."
node proxy-server.js &
PROXY_PID=$!

# Handle shutdown
trap "kill $EXPO_PID $PROXY_PID 2>/dev/null" EXIT

# Wait for either process to exit
wait
