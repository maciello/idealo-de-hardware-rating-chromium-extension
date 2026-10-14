import type { WebcamFact } from "../../facts";
import { type Evidence, quantity, type Sensor, type SensorInput, type Signal } from "../../signal";
import { WEBCAM_THRESHOLDS as T } from "./thresholds";

export const WEBCAM_SENSOR_ID = "webcam";

export const WEBCAM_SIGNAL_IDS = {
  fullHd: "webcam.full_hd",
  ir: "webcam.ir",
  low: "webcam.low_res",
  none: "webcam.none",
} as const;

type Camera = Extract<WebcamFact, { present: true }>;

type WebcamId = (typeof WEBCAM_SIGNAL_IDS)[keyof typeof WEBCAM_SIGNAL_IDS];

const signal = (
  id: WebcamId,
  kind: Signal["kind"],
  severity: Signal["severity"],
  evidence: Evidence[],
): Signal => ({ sensorId: WEBCAM_SENSOR_ID, id, kind, severity, params: null, evidence });

const evidenceOf = (camera: Camera): Evidence[] => {
  const evidence: Evidence[] = [];
  if (camera.heightPx !== undefined)
    evidence.push({ field: "webcam.heightPx", value: quantity(camera.heightPx, "px") });
  if (camera.megapixels !== undefined)
    evidence.push({ field: "webcam.megapixels", value: quantity(camera.megapixels, "MP") });
  return evidence;
};

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
            signal(WEBCAM_SIGNAL_IDS.none, "flag", "amber", [
              { field: "webcam.present", value: { kind: "answer", yes: false } },
            ]),
          ]
        : [];
    }
    const evidence = evidenceOf(webcam);
    const signals: Signal[] = [];
    if (isFullHd(webcam)) signals.push(signal(WEBCAM_SIGNAL_IDS.fullHd, "badge", "info", evidence));
    else if (deviceClass === "laptop" && isLow(webcam))
      signals.push(signal(WEBCAM_SIGNAL_IDS.low, "flag", "info", evidence));
    if (webcam.irCamera === true) {
      const ir: Evidence[] = [{ field: "webcam.irCamera", value: { kind: "answer", yes: true } }];
      signals.push(signal(WEBCAM_SIGNAL_IDS.ir, "badge", "info", ir));
    }
    return signals;
  },
};
