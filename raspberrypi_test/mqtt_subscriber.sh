#!/bin/bash

# MQTT Subscriber Script for Raspberry Pi
# This script uses mosquitto_sub to listen for IoT sensor data

BROKER="raspberrypi.local"
PORT="1883"
TOPIC="sensor/howdy/data"

echo "🔌 Starting MQTT Subscriber for Raspberry Pi..."
echo "📡 Broker: $BROKER:$PORT"
echo "📋 Topic: $TOPIC"
echo "─────────────────────────────────────────────────────────────"

# Check if mosquitto_sub is installed
if ! command -v mosquitto_sub &> /dev/null; then
    echo "❌ mosquitto_sub not found!"
    echo "📦 Please install it with: sudo apt update && sudo apt install mosquitto-clients"
    echo ""
    echo "💡 Alternative: Use the Python script instead:"
    echo "   python3 mqtt_subscriber.py"
    exit 1
fi

echo "✅ mosquitto_sub found, starting subscriber..."
echo "👂 Listening for messages... (Press Ctrl+C to stop)"
echo "─────────────────────────────────────────────────────────────"

# Counter for messages (using a temp file since bash doesn't handle signals well with variables)
COUNTER_FILE="/tmp/mqtt_message_counter"
echo "0" > "$COUNTER_FILE"

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Shutting down subscriber..."
    MESSAGE_COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
    echo "📊 Total messages received: $MESSAGE_COUNT"
    rm -f "$COUNTER_FILE"
    echo "✅ Goodbye!"
    exit 0
}

# Set trap for graceful shutdown
trap cleanup SIGINT SIGTERM

# Subscribe to MQTT topic with formatting
mosquitto_sub -h "$BROKER" -p "$PORT" -t "$TOPIC" -q 2 | while read -r message; do
    # Increment counter
    CURRENT_COUNT=$(cat "$COUNTER_FILE")
    NEW_COUNT=$((CURRENT_COUNT + 1))
    echo "$NEW_COUNT" > "$COUNTER_FILE"
    
    # Get current timestamp
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo ""
    echo "📨 Message #$NEW_COUNT received at $TIMESTAMP"
    echo "📍 Topic: $TOPIC"
    
    # Try to format JSON if possible (requires jq)
    if command -v jq &> /dev/null; then
        echo "📄 Message (Formatted):"
        echo "$message" | jq . 2>/dev/null || echo "$message"
    else
        echo "📄 Message:"
        echo "$message"
    fi
    
    echo "─────────────────────────────────────────────────────────────"
done
