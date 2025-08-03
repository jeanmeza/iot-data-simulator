export const MeasurementTypeEnum = {
  HeartRate: 'heartRate',
  R2R: 'r2r',
  BreathFrequency: 'breathFrequency',
  ECG: 'ecg',
  Respiration: 'respiration',
  AccelerationX: 'accelerationX',
  AccelerationY: 'accelerationY',
  AccelerationZ: 'accelerationZ',
  Position: 'position',
} as const;

export type MeasurementType = keyof typeof MeasurementTypeEnum;

export interface Measurement {
  date: number;
  value: number[];
  userId: number;
  measureType: MeasurementType;
}

export interface UserData {
  data: Measurement[];
}

export type UserDataArray = UserData[];

export interface DataGroup {
  timestamp: number;
  userId: number;
  heartRate: number[] | undefined;
  breathFrequency: number[] | undefined;
  respiration: number[] | undefined;
  accelerationX: number[] | undefined;
  accelerationY: number[] | undefined;
  accelerationZ: number[] | undefined;
  position: number[] | undefined;
}
