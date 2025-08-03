import { readFile } from 'fs/promises';
import path from 'path';
import type { Measurement, MqttMessage, UserDataArray } from './types';
import { MeasurementType } from './types';
import { Mqtt } from './mqtt';
import mqtt, { MqttClient } from 'mqtt/*';

const dataFolder = process.env.DATA_FOLDER || 'data';

/**
 *
 * @returns {Promise<UserDataArray>} Returns a promise that resolves to an array of UserData objects.
 */
async function readUserData(): Promise<UserDataArray> {
  const user1 = path.join(dataFolder, 'user1.json');
  const dataString = await readFile(user1, 'utf8');
  try {
    return JSON.parse(dataString);
  } catch (err: unknown) {
    console.error('Failed to parse user data JSON.', err);
    throw new Error('Failed to parse user data JSON');
  }
}

function flatMeasurementData(data: UserDataArray): Measurement[] {
  return data.map((d) => d.data).flat();
}

/**
 * Groups measurements by their timestamp into an MqttMessage format.
 *
 * @param measurements the measurements to group by timestamp
 * @returns a Map where the key is the timestamp and the value is an MqttMessage object
 */
function groupMeasurementsByTimestamp(
  measurements: Measurement[],
): Map<number, MqttMessage> {
  const group = new Map();
  for (const measurement of measurements) {
    const mt = measurement.measureType;
    if (!measurementTypeIsValid(mt)) {
      continue;
    }
    const timestamp = measurement.date;
    if (!group.has(timestamp)) {
      group.set(timestamp, {
        timestamp,
        userId: measurement.userId,
      });
    }
    const measureKey: string =
      MeasurementType[mt as keyof typeof MeasurementType];

    if (measureKey) {
      group.get(timestamp)[measureKey] = measurement.value;
    }
  }
  return group;
}

function measurementTypeIsValid(measureType: string) {
  const keys = Object.keys(MeasurementType);
  return keys.includes(measureType);
}

async function prepareAndSendMessages(
  data: Map<number, MqttMessage>,
  mqttClient: Mqtt,
) {
  const sortedKeys = Array.from(data.keys()).sort((a, b) => a - b);

  const timeDeltas = sortedKeys.slice(1).map((key, i) => key - sortedKeys[i]);

  for (let i = 0; i < sortedKeys.length; i++) {
    const key = sortedKeys[i];
    const msg = { ...data.get(key), timestamp: Date.now() };

    mqttClient.sendMessage('/sensor/howdy/data', JSON.stringify(msg));

    if (i < timeDeltas.length) {
      const delay = timeDeltas[i]; // original delta in seconds (e.g., 1/sensorHz)
      await new Promise((res) => setTimeout(res, delay * 1000));
    }
  }
}

export default async function main() {
  const data = await readUserData();
  const groupedData = groupMeasurementsByTimestamp(flatMeasurementData(data));

  const mqttClient = new Mqtt();
  await mqttClient.startConnection();
  await prepareAndSendMessages(groupedData, mqttClient);
  await mqttClient.closeConnection();
}
