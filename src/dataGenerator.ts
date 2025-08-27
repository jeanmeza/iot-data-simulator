import type { Measurement, UserData } from './types';

/**
 * Generate variation for a numeric value based on the measurement type
 */
function generateVariation(value: number, measureType: string): number {
  const variations: Record<string, { min: number; max: number }> = {
    HeartRate: { min: 0.85, max: 1.15 }, // ±15% for heart rate
    BreathFrequency: { min: 0.8, max: 1.2 }, // ±20% for breathing
    R2R: { min: 0.9, max: 1.1 }, // ±10% for R2R intervals
    PhoneLatitude: { min: 0.9999, max: 1.0001 }, // Very small GPS variation
    PhoneLongitude: { min: 0.9999, max: 1.0001 }, // Very small GPS variation
    PhoneAltitude: { min: 0.95, max: 1.05 }, // ±5% for altitude
    Ecg: { min: 0.95, max: 1.05 }, // ±5% for ECG values
    Respiration: { min: 0.98, max: 1.02 }, // ±2% for respiration
    AccelerationX: { min: 0.9, max: 1.1 }, // ±10% for acceleration
    AccelerationY: { min: 0.9, max: 1.1 }, // ±10% for acceleration
    AccelerationZ: { min: 0.9, max: 1.1 }, // ±10% for acceleration
  };

  const variation = variations[measureType] || { min: 0.9, max: 1.1 };
  const factor =
    variation.min + Math.random() * (variation.max - variation.min);
  return value * factor;
}

/**
 * Generate a new user ID based on the original user ID
 */
function generateUserId(
  originalUserId: number,
  userIndex: number,
  customUserIds?: number[],
): number {
  if (customUserIds && userIndex < customUserIds.length) {
    return customUserIds[userIndex];
  }
  return originalUserId + userIndex * 1000;
}

/**
 * Add time variance to timestamps to simulate different user activities
 */
function addTimeVariance(timestamp: number, userIndex: number): number {
  // Add up to ±30 minutes variance per user
  const maxVariance = 30 * 60; // 30 minutes in seconds
  const variance = ((userIndex * 7) % (maxVariance * 2)) - maxVariance; // Deterministic but varied
  return timestamp + variance;
}

/**
 * Clone and modify a measurement for a new user
 */
function cloneMeasurement(
  measurement: Measurement,
  userIndex: number,
  customUserIds?: number[],
): Measurement {
  const newMeasurement: Measurement = {
    ...measurement,
    userId: generateUserId(measurement.userId, userIndex, customUserIds),
    date: addTimeVariance(measurement.date, userIndex),
    value: measurement.value.map((val) => {
      if (
        measurement.measureType === 'PhoneLatitude' ||
        measurement.measureType === 'PhoneLongitude'
      ) {
        // For GPS coordinates, add small random offset instead of percentage
        const offset = (Math.random() - 0.5) * 0.001; // ±0.0005 degrees (~55m)
        return val + offset;
      }
      return generateVariation(val, measurement.measureType);
    }),
  };

  // Remove _id to avoid duplicates
  delete newMeasurement._id;

  return newMeasurement;
}

/**
 * Filter measurements to include only GPS data (PhoneLatitude, PhoneLongitude, PhoneAltitude)
 */
function filterGpsData(measurements: Measurement[]): Measurement[] {
  const gpsTypes = ['PhoneLatitude', 'PhoneLongitude', 'PhoneAltitude'];
  return measurements.filter((m) => gpsTypes.includes(m.measureType));
}

/**
 * Generate data for multiple users from existing data
 */
export function generateMultiUserData<T extends Measurement[] | UserData[]>(
  originalData: T,
  numberOfUsers: number,
  gpsOnly: boolean = false,
  customUserIds?: number[],
): T {
  if (numberOfUsers <= 1) {
    return originalData;
  }

  // Validate custom user IDs if provided
  if (customUserIds && customUserIds.length !== numberOfUsers) {
    throw new Error(
      `Number of custom user IDs (${customUserIds.length}) must match number of users (${numberOfUsers})`,
    );
  }

  const isUserDataArray =
    Array.isArray(originalData) &&
    originalData.length > 0 &&
    'data' in originalData[0];

  if (isUserDataArray) {
    // Handle UserData[] format (like 03ago2023.json)
    const userData = originalData as UserData[];
    let processedUserData = userData;

    // Filter GPS data if requested
    if (gpsOnly) {
      processedUserData = userData.map((userDataItem) => ({
        data: filterGpsData(userDataItem.data),
      }));
    }

    const result: UserData[] = [];

    // Process each user
    for (let userIndex = 0; userIndex < numberOfUsers; userIndex++) {
      if (userIndex === 0 && !customUserIds) {
        // Include original data for first user if no custom IDs
        result.push(...processedUserData);
      } else {
        // Generate data for each user (including first user if custom IDs provided)
        const newUserData: UserData[] = processedUserData.map(
          (userDataItem) => ({
            data: userDataItem.data.map((measurement) =>
              cloneMeasurement(measurement, userIndex, customUserIds),
            ),
          }),
        );
        result.push(...newUserData);
      }
    }

    return result as T;
  } else {
    // Handle Measurement[] format (like 05ago2025.json)
    const measurements = originalData as Measurement[];
    let processedMeasurements = measurements;

    // Filter GPS data if requested
    if (gpsOnly) {
      processedMeasurements = filterGpsData(measurements);
    }

    const result: Measurement[] = [];

    // Process each user
    for (let userIndex = 0; userIndex < numberOfUsers; userIndex++) {
      if (userIndex === 0 && !customUserIds) {
        // Include original data for first user if no custom IDs
        result.push(...processedMeasurements);
      } else {
        // Generate data for each user (including first user if custom IDs provided)
        const newMeasurements = processedMeasurements.map((measurement) =>
          cloneMeasurement(measurement, userIndex, customUserIds),
        );
        result.push(...newMeasurements);
      }
    }

    return result as T;
  }
}
