/**
 * This is for sending data to the thingworx platform.
 */
import { connectAsync, ErrorWithReasonCode, MqttClient } from 'mqtt';
import { setTimeout } from 'node:timers/promises';
const server = 'mqtt://212.78.1.205';
const topic = '/Thingworx/MezaRamezani.GpsSensor';
const positionTopic = `${topic}/position`;
const speedTopic = `${topic}/speed`;
const port = 1883;
const username = 'studenti';
const password = 'studentiDRUIDLAB_1';
const connectTimeout = 2 * 1000; // milliseconds
const reconnectPeriod = 1 * 1000; // milliseconds
const keepalive = 2; // seconds
const qos = 2;
const reconnectOnConnackError = true;
const interval = 1000; // timeout interval

/**
 * @param {Error | ErrorWithReasonCode} err
 * @param {MqttClient} client
 */
async function handleError(err, client) {
  if (err) console.error(err.message);
  await closeClient(client);
}

/**
 * @param {MqttClient} client
 */
async function closeClient(client) {
  if (client) await client.endAsync();
}

(async function () {
  let client = await connectAsync(server, {
    port,
    username,
    password,
    keepalive,
    reconnectPeriod,
    connectTimeout,
    reconnectOnConnackError,
  });

  console.log('client connected');

  client.on('connect', () => console.log('client re-connected'));

  client.on('reconnect', () => console.log('client re-connecting'));

  client.on('disconnect', () => console.log('client disconnected'));

  client.on('offline', () => console.log('client offline'));

  client.on('error', (err) => handleError(err, client));

  const position = {
    latitude: 40.4033013150143,
    longitude: 8.972326122618384,
    elevation: 0,
  };

  let currentSpeed = 0;
  while (true) {
    if (currentSpeed > 100) {
      currentSpeed = 0;
    }
    await client.publishAsync(positionTopic, JSON.stringify(position), {
      qos,
    });
    currentSpeed += 1;
    await client.publishAsync(speedTopic, JSON.stringify(currentSpeed), {
      qos,
    });
    await setTimeout(interval);
  }
})();
