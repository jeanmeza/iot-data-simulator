export const MeasurementType = {
  HeartRate: 'heartRate',
  BreathFrequency: 'breathFrequency',
  Respiration: 'respiration',
  AccelerationX: 'accelerationX',
  AccelerationY: 'accelerationY',
  AccelerationZ: 'accelerationZ',
  Position: 'position',
} as const;

export interface Measurement {
  date: number;
  value: number[];
  userId: number;
  measureType: string;
}

export interface UserData {
  data: Measurement[];
}

export type UserDataArray = UserData[];

export interface MqttMessage {
  timestamp: number,
  userId: number,
  heartRate: number[] | undefined,
  breathFrequency: number[] | undefined,
  respiration: number[] | undefined,
  accelerationX: number[] | undefined,
  accelerationY: number[] | undefined,
  accelerationZ: number[] | undefined,
  position: number[] | undefined,
}
