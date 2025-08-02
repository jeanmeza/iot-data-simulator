export const MeasurementType = {
  HeartRate: 'heartRate',
  BreathFrequency: 'breathFrequency',
  Respiration: 'respiration',
  AccelerationX: 'accelerationX',
  AccelerationY: 'accelerationY',
  AccelerationZ: 'accelerationZ',
  Position: 'Position',
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

export interface MqttMessage {}
