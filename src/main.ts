import { readFile } from 'fs/promises';
import path from 'path';
import type {
  Measurement,
  MeasurementType,
  DataGroup,
  UserData,
} from './types';
import { FakeMqtt, IMqtt, Mqtt } from './mqtt';

const dataFolder = process.env.DATA_FOLDER || 'data';

/**
 * Read user data from a JSON file.
 *
 * @returns {Promise<UserData[]>} Returns a promise that resolves to an array of UserData objects.
 */
async function readUserData(
  filename: string,
): Promise<UserData[] | Measurement[]> {
  const dataFile = path.join(dataFolder, filename);
  const dataString = await readFile(dataFile, 'utf-8');
  try {
    return JSON.parse(dataString);
  } catch (err: unknown) {
    console.error('Failed to parse user data JSON.', err);
    throw new Error('Failed to parse user data JSON');
  }
}

/**
 * Flatten the user data into a single array of Measurement objects.
 *
 * @param data the user data to flatten
 * @returns a flat array of Measurement objects
 */
function flatMeasurementData(data: UserData[]): Measurement[] {
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
): Map<number, DataGroup> {
  const group = new Map();
  for (const measurement of measurements) {
    const measureKey = measurement.measureType;
    if (ignoreMeasurementType(measureKey)) {
      continue;
    }
    const timestamp = measurement.date;
    if (!group.has(timestamp)) {
      group.set(timestamp, {
        timestamp,
        userId: measurement.userId,
      });
    }

    if (group.has(timestamp)) {
      group.get(timestamp)[measureKey] = measurement.value;
    }
  }
  return group;
}

/**
 *  Check if the measurement type is valid.
 *
 * @param measureType the measurement type to validate
 * @returns
 */
function ignoreMeasurementType(measureType: MeasurementType) {
  return (
    measureType === 'R2R' || measureType === 'ECG' || measureType === 'Position'
  );
}

/**
 * Prepare and send messages to the MQTT broker.
 *
 * @param data a Map of timestamps to MqttMessage objects
 * @param mqttClient the MQTT client to use for sending messages
 * @param abortSignal an AbortSignal to allow graceful shutdown
 */
async function prepareAndSendMessages(
  data: Map<number, DataGroup>,
  mqttClient: IMqtt,
  abortSignal: AbortSignal,
) {
  const sortedTimestamps = Array.from(data.keys()).sort((a, b) => a - b);
  const timeDeltas = sortedTimestamps
    .slice(1)
    .map((key, i) => key - sortedTimestamps[i]);

  const measurementTypes = [
    'HeartRate',
    'BreathFrequency',
    'Respiration',
    'AccelerationX',
    'AccelerationY',
    'AccelerationZ',
    'PhoneLatitude',
    'PhoneLongitude',
    'PhoneAltitude',
  ] as const satisfies ReadonlyArray<
    keyof Omit<DataGroup, 'timestamp' | 'userId'>
  >;

  for (let i = 0; i < sortedTimestamps.length; i++) {
    if (abortSignal.aborted) {
      break;
    }

    const timestamp = sortedTimestamps[i];
    const datum = data.get(timestamp);
    if (!datum) {
      continue;
    }
    const topic = 'sensor/howdy/data';

    for (const type of measurementTypes) {
      const value = datum[type];
      if (value) {
        const msg: Measurement = {
          date: Date.now(),
          value,
          userId: datum.userId,
          measureType: type,
        };
        mqttClient.sendMessage(topic, JSON.stringify(msg));
      }
    }

    await waitDelta(i, timeDeltas);
    console.log('');
  }
}

/**
 * Wait for a specified time delta before proceeding.
 *
 * @param i the current index in the timeDeltas array
 * @param timeDeltas  an array of time deltas in seconds
 */
async function waitDelta(i: number, timeDeltas: number[]) {
  if (i < timeDeltas.length) {
    const delay = timeDeltas[i];
    await new Promise((res) => setTimeout(res, delay * 1000));
  }
}

/**
 * Read user data from a file and send it via MQTT.
 *
 * @param filename the name of the file containing user data
 * @param mqttClient the MQTT client to use for sending messages
 * @param flattenArray whether to flatten the user data array
 * @returns a promise that resolves when the data has been read and sent
 * @throws Error if there is an issue reading or parsing the data
 */
async function readDataAndSendIt(
  filename: string,
  mqttClient: IMqtt,
  flattenArray: boolean,
): Promise<void> {
  const data = await readUserData(filename);
  const flattenedData = flattenArray
    ? flatMeasurementData(data as UserData[])
    : (data as Measurement[]);
  const groupedData = groupMeasurementsByTimestamp(flattenedData);
  await prepareAndSendMessages(
    groupedData,
    mqttClient,
    new AbortController().signal,
  );
}

/**
 * Main function to initialize the MQTT client and send messages.
 *
 * @param abortSignal an AbortSignal to allow graceful shutdown
 * @returns a cleanup function to close the MQTT connection gracefully
 */
export default async function main(
  abortSignal: AbortSignal,
): Promise<() => Promise<void>> {
  // const mqttClient: IMqtt = new FakeMqtt();
  const mqttClient: IMqtt = new Mqtt();
  await mqttClient.startConnection();

  Promise.all([
    readDataAndSendIt('user1.json', mqttClient, true),
    readDataAndSendIt('05ago2025.json', mqttClient, false),
    readDataAndSendIt('07ago2025.json', mqttClient, false),
  ]).catch((err) => {
    console.error('Error reading data and sending messages:', err);
  });

  return async () => {
    await mqttClient.closeConnection();
  };
}
