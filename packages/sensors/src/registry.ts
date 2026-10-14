import { powerSensor } from "./power/sensor";
import { redFlagsSensor } from "./red-flags";
import type { Sensor, SensorInput, Signal } from "./signal";
import { webcamSensor } from "./webcam/sensor";

/** Every sensor, in the order their signals are reported. */
export const SENSORS: readonly Sensor[] = [powerSensor, redFlagsSensor, webcamSensor];

export const senseAll = (input: SensorInput, sensors: readonly Sensor[] = SENSORS): Signal[] =>
  sensors.flatMap((sensor) => sensor.sense(input));
