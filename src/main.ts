import { readFile } from 'fs/promises';
import path from 'path';
import type { Measurement, UserDataArray } from './types';
import { MeasurementType } from './types';
import { Mqtt } from './mqtt';
import { MqttClient } from 'mqtt/*';

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

function groupMeasurementsByTimestamp(measurements: Measurement[]) {
  const group = new Map();
  for (const measurement of measurements) {
    const mt = measurement.measureType;
    if (!measurementTypeIsValid(mt)) {
      continue;
    }
    const timestamp = measurement.date;
    if (!group.has(timestamp)) {
      group.set(timestamp, {
        timestamp: new Date().getTime(),
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

export default async function main() {
  const data = await readUserData();
  const groupedData = groupMeasurementsByTimestamp(flatMeasurementData(data));

  // TODO: send data to MQTT broker. The measurement types to send are defined in
  //  the Topic enum

  const mqttClient = new Mqtt();
  await mqttClient.startConnection();
  const client: MqttClient = mqttClient.client!;
  await mqttClient.closeConnection();
}
