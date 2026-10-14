export type { OsKind, ProductFacts, RamType, StorageKind, VideoOutput, WebcamFact } from "./facts";
export { fromCharacteristics, fromDatasheet, mergeFacts } from "./facts";
export { POWER_SENSOR_ID, POWER_SIGNAL_IDS } from "./power/sensor";
export { RED_FLAG_IDS, RED_FLAGS_SENSOR_ID } from "./red-flags";
export { SENSORS, senseAll } from "./registry";
export type {
  DeviceClass,
  Evidence,
  Sensor,
  SensorClock,
  SensorCpu,
  SensorInput,
  Signal,
} from "./signal";
export { WEBCAM_SENSOR_ID, WEBCAM_SIGNAL_IDS } from "./webcam/sensor";
