export type { OsKind, ProductFacts, RamType, StorageKind, VideoOutput, WebcamFact } from "./facts";
export { fromCharacteristics, fromDatasheet, mergeFacts } from "./facts";
export {
  POWER_SENSOR_ID,
  POWER_SIGNAL_IDS,
  RED_FLAG_IDS,
  RED_FLAGS_SENSOR_ID,
  SENSORS,
  senseAll,
  WEBCAM_SENSOR_ID,
  WEBCAM_SIGNAL_IDS,
} from "./sensors";
export type {
  DeviceClass,
  Evidence,
  EvidenceField,
  EvidenceUnit,
  EvidenceValue,
  Sensor,
  SensorClock,
  SensorCpu,
  SensorInput,
  Signal,
  SignalId,
  SignalParamsById,
} from "./signal";
