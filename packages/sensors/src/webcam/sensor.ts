import type { WebcamFact } from "../facts";
import type { Evidence, Sensor, SensorInput, Signal } from "../signal";
import { WEBCAM_COPY } from "./copy";
import { WEBCAM_THRESHOLDS as T } from "./thresholds";

export const WEBCAM_SENSOR_ID = "webcam";

export const WEBCAM_SIGNAL_IDS = {
  fullHd: "webcam.full_hd",
  ir: "webcam.ir",
  low: "webcam.low_res",
  none: "webcam.none",
} as const;

type Camera = Extract<WebcamFact, { present: true }>;

const signal = (
  id: string,
  kind: Signal["kind"],
  severity: Signal["severity"],
  copy: { label: string; detail: string },
  evidence: Evidence[],
): Signal => ({ sensorId: WEBCAM_SENSOR_ID, id, kind, severity, ...copy, evidence });

const evidenceOf = (camera: Camera): Evidence[] => [
  ...(camera.heightPx === undefined
    ? []
    : [{ field: "webcam.heightPx", value: `${camera.heightPx} px` }]),
  ...(camera.megapixels === undefined
    ? []
    : [{ field: "webcam.megapixels", value: `${camera.megapixels} MP` }]),
];

const isFullHd = (camera: Camera): boolean =>
  (camera.heightPx ?? 0) >= T.fullHdMinHeightPx ||
  (camera.megapixels ?? 0) >= T.fullHdMinMegapixels;

const isLow = (camera: Camera): boolean =>
  camera.heightPx !== undefined && camera.heightPx <= T.lowMaxHeightPx;

/**
 * Rates the webcam: badges for a sharp or an IR camera, an info flag for 720p and an amber flag for
 * a laptop whose datasheet says it has none. A desktop gets nothing; silence is never "no webcam".
 */
export const webcamSensor: Sensor = {
  id: WEBCAM_SENSOR_ID,
  sense({ facts, deviceClass }: SensorInput): Signal[] {
    const { webcam } = facts;
    if (webcam === undefined || deviceClass === "desktop") return [];
    if (!webcam.present) {
      return deviceClass === "laptop"
        ? [
            signal(WEBCAM_SIGNAL_IDS.none, "flag", "amber", WEBCAM_COPY.none, [
              { field: "webcam.present", value: "no" },
            ]),
          ]
        : [];
    }
    const evidence = evidenceOf(webcam);
    const signals: Signal[] = [];
    if (isFullHd(webcam))
      signals.push(signal(WEBCAM_SIGNAL_IDS.fullHd, "badge", "info", WEBCAM_COPY.fullHd, evidence));
    else if (deviceClass === "laptop" && isLow(webcam))
      signals.push(signal(WEBCAM_SIGNAL_IDS.low, "flag", "info", WEBCAM_COPY.low, evidence));
    if (webcam.irCamera === true) {
      const ir = [{ field: "webcam.irCamera", value: "yes" }];
      signals.push(signal(WEBCAM_SIGNAL_IDS.ir, "badge", "info", WEBCAM_COPY.ir, ir));
    }
    return signals;
  },
};
