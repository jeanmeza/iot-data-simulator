#!/usr/bin/env node

import mqtt from 'mqtt';

// MQTT broker configuration
const BROKER_URL = 'mqtt://raspberrypi.local';
const BROKER_PORT = 1883;
const TOPIC = 'sensor/howdy/data';

console.log('🔌 Starting MQTT Subscriber for Raspberry Pi...');
console.log(`📡 Connecting to: ${BROKER_URL}:${BROKER_PORT}`);
console.log(`📋 Subscribing to topic: ${TOPIC}`);
console.log('─'.repeat(60));

// Connect to MQTT broker
const client = mqtt.connect(BROKER_URL, {
  port: BROKER_PORT,
  keepalive: 60,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  clean: true
});

let messageCount = 0;
let lastMessageTime = null;

// Connection event handlers
client.on('connect', () => {
  console.log('✅ Connected to MQTT broker successfully!');
  
  // Subscribe to the sensor data topic
  client.subscribe(TOPIC, { qos: 2 }, (err) => {
    if (err) {
      console.error('❌ Failed to subscribe to topic:', err.message);
      process.exit(1);
    } else {
      console.log(`✅ Successfully subscribed to topic: ${TOPIC}`);
      console.log('👂 Listening for messages... (Press Ctrl+C to stop)');
      console.log('─'.repeat(60));
    }
  });
});

client.on('error', (err) => {
  console.error('❌ MQTT connection error:', err.message);
});

client.on('close', () => {
  console.log('🔌 MQTT connection closed');
});

client.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT broker...');
});

client.on('offline', () => {
  console.log('📴 MQTT client offline');
});

// Message handler
client.on('message', (topic, message) => {
  messageCount++;
  lastMessageTime = new Date();
  
  console.log(`\n📨 Message #${messageCount} received at ${lastMessageTime.toISOString()}`);
  console.log(`📍 Topic: ${topic}`);
  
  try {
    // Try to parse the message as JSON for better display
    const parsedMessage = JSON.parse(message.toString());
    console.log('📄 Message (JSON):');
    console.log(JSON.stringify(parsedMessage, null, 2));
    
    // Display specific sensor data if available
    if (parsedMessage.measureType && parsedMessage.value) {
      console.log(`🔍 Sensor Type: ${parsedMessage.measureType}`);
      console.log(`📊 Value: ${Array.isArray(parsedMessage.value) ? parsedMessage.value.join(', ') : parsedMessage.value}`);
      console.log(`👤 User ID: ${parsedMessage.userId}`);
    }
  } catch (err) {
    // If not JSON, display as plain text
    console.log('📄 Message (Raw):');
    console.log(message.toString());
  }
  
  console.log('─'.repeat(60));
});

// Display statistics periodically
setInterval(() => {
  if (messageCount > 0) {
    console.log(`\n📊 Statistics: ${messageCount} messages received`);
    if (lastMessageTime) {
      const timeSinceLastMessage = (new Date() - lastMessageTime) / 1000;
      console.log(`⏱️  Last message: ${timeSinceLastMessage.toFixed(1)} seconds ago`);
    }
  } else {
    console.log('\n⏳ No messages received yet...');
  }
}, 10000); // Every 10 seconds

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down subscriber...');
  console.log(`📊 Total messages received: ${messageCount}`);
  
  client.end(() => {
    console.log('✅ MQTT client disconnected cleanly');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  client.end();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err.message);
  client.end();
  process.exit(1);
});
