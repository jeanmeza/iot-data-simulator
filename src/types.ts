export type MeasurementType =
  | 'HeartRate'
  | 'R2R'
  | 'BreathFrequency'
  | 'ECG'
  | 'Respiration'
  | 'AccelerationX'
  | 'AccelerationY'
  | 'AccelerationZ'
  | 'Position';

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
  HeartRate?: number[];
  BreathFrequency?: number[];
  Respiration?: number[];
  AccelerationX?: number[];
  AccelerationY?: number[];
  AccelerationZ?: number[];
}
