import { readFile, writeFile, appendFile } from 'fs/promises';
import path from 'path';
import type {
  Measurement,
  MeasurementType,
  DataGroup,
  UserData,
} from './types';
import { FakeMqtt, IMqtt, Mqtt } from './mqtt';
import { generateMultiUserData } from './dataGenerator';
import { connectAsync, IClientOptions } from 'mqtt';

const dataFolder = process.env.DATA_FOLDER || 'data';

function getNumberOfUsers(): number {
  return parseInt(process.env.NUMBER_OF_USERS || '3', 10);
}

function getUserIds(): number[] | null {
  return process.env.USER_IDS
    ? process.env.USER_IDS.split(',').map((id) => parseInt(id.trim(), 10))
    : null;
}

function getOutputFile(): string {
  return process.env.OUTPUT_FILE || 'mqtt_output.log';
}

/**
 * Read user data from a JSON file and generate data for multiple users.
 *
 * @returns {Promise<UserData[]>} Returns a promise that resolves to an array of UserData objects.
 */
async function readUserData(
  filename: string,
  gpsOnly: boolean = false,
): Promise<UserData[] | Measurement[]> {
  const dataFile = path.join(dataFolder, filename);
  const dataString = await readFile(dataFile, 'utf-8');
  try {
    const originalData = JSON.parse(dataString);

    const numberOfUsers = getNumberOfUsers();
    const userIds = getUserIds();

    // Validate user IDs if provided
    if (userIds && userIds.length !== numberOfUsers) {
      throw new Error(
        `Number of user IDs (${userIds.length}) must match NUMBER_OF_USERS (${numberOfUsers})`,
      );
    }

    // Generate data for multiple users
    return generateMultiUserData(
      originalData,
      numberOfUsers,
      gpsOnly,
      userIds || undefined,
    );
  } catch (err: unknown) {
    console.error('Failed to parse user data JSON.', err);
    throw new Error('Failed to parse user data JSON');
  }
}

/**
 * Log MQTT message to file for verification
 */
async function logMessageToFile(topic: string, message: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] Topic: ${topic} | Message: ${message}\n`;
  try {
    await appendFile(getOutputFile(), logEntry);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Initialize output log file
 */
async function initializeLogFile(): Promise<void> {
  const numberOfUsers = getNumberOfUsers();
  const userIds = getUserIds();
  const outputFile = getOutputFile();

  const header = `=== MQTT Output Log - Started at ${new Date().toISOString()} ===\n`;
  const config = `Configuration: NUMBER_OF_USERS=${numberOfUsers}, USER_IDS=${userIds ? userIds.join(',') : 'auto-generated'}\n\n`;
  try {
    await writeFile(outputFile, header + config);
    console.log(`📄 Output will be logged to: ${outputFile}`);
  } catch (error) {
    console.error('Failed to initialize log file:', error);
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
  userId: number,
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
          userId: userId,
          measureType: type,
        };
        const msgString = JSON.stringify(msg);
        mqttClient.sendMessage(topic, msgString);

        // Log message to file for verification
        await logMessageToFile(topic, msgString);
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
 * @param gpsOnly whether to include only GPS data (PhoneLatitude, PhoneLongitude, PhoneAltitude)
 * @returns a promise that resolves when the data has been read and sent
 * @throws Error if there is an issue reading or parsing the data
 */
async function readDataAndSendIt(
  abortSignal: AbortSignal,
  filename: string,
  mqttClient: IMqtt,
  flattenArray: boolean,
  gpsOnly: boolean = false,
): Promise<void> {
  const data = await readUserData(filename, gpsOnly);
  const flattenedData = flattenArray
    ? flatMeasurementData(data as UserData[])
    : (data as Measurement[]);

  // Group data by user ID
  const userGroups = new Map<number, Measurement[]>();
  for (const measurement of flattenedData) {
    if (!userGroups.has(measurement.userId)) {
      userGroups.set(measurement.userId, []);
    }
    userGroups.get(measurement.userId)!.push(measurement);
  }

  console.log(`Processing data for ${userGroups.size} users from ${filename}`);

  // Process each user's data
  const promises = Array.from(userGroups.entries()).map(
    async ([userId, measurements]) => {
      const groupedData = groupMeasurementsByTimestamp(measurements);
      console.log(
        `User ${userId}: ${measurements.length} measurements, ${groupedData.size} time points`,
      );
      return prepareAndSendMessages(
        userId,
        groupedData,
        mqttClient,
        abortSignal,
      );
    },
  );

  await Promise.all(promises);
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
  // Initialize log file
  await initializeLogFile();

  // const mqttClient: IMqtt = new FakeMqtt();
  const mqttClient: IMqtt = new Mqtt();
  await mqttClient.startConnection();
  const subscriberClient = await createSubscriberClient();

  Promise.all([
    readDataAndSendIt(abortSignal, '07ago2025.json', mqttClient, false, true), // GPS only
    readDataAndSendIt(abortSignal, '03ago2023.json', mqttClient, true, false), // All sensor data
  ]).catch((err) => {
    console.error('Error reading data and sending messages:', err);
  });

  return async () => {
    await mqttClient.closeConnection();
    await subscriberClient.endAsync();
  };
}

async function createSubscriberClient() {
  const connectionOptions: IClientOptions = {
    port: 1883,
    keepalive: 2,
    reconnectPeriod: 1 * 1000,
    connectTimeout: 15 * 1000,
    reconnectOnConnackError: true,
    username: 'studenti',
    password: 'studentiDRUIDLAB_1',
  };
  const client = await connectAsync('mqtt://212.78.1.205', connectionOptions);
  client.subscribe('sensor/actuator/alert');
  client.on('message', (topic, message) => {
    console.log(
      `Received message on ${topic}: ${message.toString()}`.toUpperCase(),
    );
  });
  console.log(
    'Subscriber connected, subscribing to topic sensor/actuator/alert',
  );
  return client;
}
