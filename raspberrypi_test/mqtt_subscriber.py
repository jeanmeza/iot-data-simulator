#!/usr/bin/env python3
"""
MQTT Subscriber for Raspberry Pi
Listens for IoT sensor data on the sensor/howdy/data topic
"""

import paho.mqtt.client as mqtt
import json
import time
import signal
import sys
from datetime import datetime

# MQTT Configuration
BROKER_HOST = "broker.hivemq.com"
BROKER_PORT = 1883
TOPIC = "sensor/howdy/data"
QOS = 2

# Global variables
message_count = 0
last_message_time = None
start_time = time.time()

def on_connect(client, userdata, flags, rc):
    """Callback for when the client connects to the broker"""
    if rc == 0:
        print("✅ Connected to MQTT broker successfully!")
        print(f"📋 Subscribing to topic: {TOPIC}")
        client.subscribe(TOPIC, QOS)
        print("👂 Listening for messages... (Press Ctrl+C to stop)")
        print("─" * 60)
    else:
        print(f"❌ Failed to connect to MQTT broker. Return code: {rc}")
        sys.exit(1)

def on_message(client, userdata, msg):
    """Callback for when a message is received"""
    global message_count, last_message_time
    
    message_count += 1
    last_message_time = time.time()
    current_time = datetime.now().isoformat()
    
    print(f"\n📨 Message #{message_count} received at {current_time}")
    print(f"📍 Topic: {msg.topic}")
    
    try:
        # Try to parse as JSON
        message_str = msg.payload.decode('utf-8')
        parsed_message = json.loads(message_str)
        
        print("📄 Message (JSON):")
        print(json.dumps(parsed_message, indent=2))
        
        # Display specific sensor data
        if 'measureType' in parsed_message and 'value' in parsed_message:
            measure_type = parsed_message['measureType']
            value = parsed_message['value']
            user_id = parsed_message.get('userId', 'Unknown')
            
            print(f"🔍 Sensor Type: {measure_type}")
            if isinstance(value, list):
                if len(value) > 5:
                    print(f"📊 Value: [{value[0]}, {value[1]}, ... {value[-2]}, {value[-1]}] ({len(value)} values)")
                else:
                    print(f"📊 Value: {value}")
            else:
                print(f"📊 Value: {value}")
            print(f"👤 User ID: {user_id}")
            
    except json.JSONDecodeError:
        # If not JSON, display as raw text
        print("📄 Message (Raw):")
        print(msg.payload.decode('utf-8'))
    except Exception as e:
        print(f"❌ Error processing message: {e}")
        print("📄 Raw payload:")
        print(msg.payload.decode('utf-8'))
    
    print("─" * 60)

def on_disconnect(client, userdata, rc):
    """Callback for when the client disconnects"""
    if rc != 0:
        print("❌ Unexpected disconnection from MQTT broker")
    else:
        print("🔌 Disconnected from MQTT broker")

def on_subscribe(client, userdata, mid, granted_qos):
    """Callback for when subscription is confirmed"""
    print(f"✅ Successfully subscribed to topic: {TOPIC} (QoS: {granted_qos[0]})")

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    print("\n\n🛑 Shutting down subscriber...")
    print(f"📊 Total messages received: {message_count}")
    
    if message_count > 0:
        runtime = time.time() - start_time
        rate = message_count / runtime if runtime > 0 else 0
        print(f"⏱️  Runtime: {runtime:.1f} seconds")
        print(f"📈 Average rate: {rate:.2f} messages/second")
    
    print("✅ Goodbye!")
    client.disconnect()
    sys.exit(0)

def print_status():
    """Print periodic status updates"""
    if message_count > 0:
        print(f"\n📊 Status: {message_count} messages received")
        if last_message_time:
            time_since_last = time.time() - last_message_time
            print(f"⏱️  Last message: {time_since_last:.1f} seconds ago")
    else:
        print("\n⏳ No messages received yet...")

def main():
    global client
    
    print("🔌 Starting MQTT Subscriber for Raspberry Pi...")
    print(f"📡 Connecting to: {BROKER_HOST}:{BROKER_PORT}")
    print("─" * 60)
    
    # Create MQTT client
    client = mqtt.Client()
    
    # Set callbacks
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    client.on_subscribe = on_subscribe
    
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Connect to broker
        client.connect(BROKER_HOST, BROKER_PORT, 60)
        
        # Start the loop in a separate thread
        client.loop_start()
        
        # Keep the main thread alive and print periodic status
        while True:
            time.sleep(10)  # Print status every 10 seconds
            print_status()
            
    except ConnectionRefusedError:
        print("❌ Connection refused. Check your network connection and broker settings.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
