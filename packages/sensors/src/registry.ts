import { powerSensor } from "./power/sensor";
import type { Sensor, SensorInput, Signal } from "./signal";

/** Every sensor, in the order their signals are reported. */
export const SENSORS: readonly Sensor[] = [powerSensor];

export const senseAll = (input: SensorInput, sensors: readonly Sensor[] = SENSORS): Signal[] =>
  sensors.flatMap((sensor) => sensor.sense(input));
