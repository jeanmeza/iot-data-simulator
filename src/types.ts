export type MeasurementType =
  | 'HeartRate'
  | 'R2R'
  | 'BreathFrequency'
  | 'ECG'
  | 'Respiration'
  | 'AccelerationX'
  | 'AccelerationY'
  | 'AccelerationZ'
  | 'Position'
  | 'PhoneLatitude'
  | 'PhoneLongitude'
  | 'PhoneAltitude';

export interface Measurement {
  _id?: { $oid: string } | undefined; // Not all of the data have this field
  date: number;
  value: number[];
  userId: number;
  measureType: MeasurementType;
}

export interface UserData {
  data: Measurement[];
}

export interface DataGroup {
  timestamp: number;
  userId: number;
  HeartRate?: number[] | undefined;
  BreathFrequency?: number[] | undefined;
  Respiration?: number[] | undefined;
  AccelerationX?: number[] | undefined;
  AccelerationY?: number[] | undefined;
  AccelerationZ?: number[] | undefined;
  PhoneLatitude?: number[] | undefined;
  PhoneLongitude?: number[] | undefined;
  PhoneAltitude?: number[] | undefined;
}
