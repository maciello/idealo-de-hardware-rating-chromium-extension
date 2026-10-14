import type { VideoOutput } from "../../../facts";
import { RED_FLAG_IDS as ID } from "../ids";
import { RED_FLAG_THRESHOLDS as T } from "../thresholds";
import { atMost, below, type FlagRule, flagRule } from "./model";

/** HDMI is the only way out, and every HDMI port is a version that caps 4K at 30 Hz. */
const onlyOldHdmi = (outputs: readonly VideoOutput[] | undefined): boolean => {
  if (outputs === undefined) return false;
  const hdmi = outputs.flatMap((output) => (output.kind === "hdmi" ? [output.version] : []));
  return (
    hdmi.length > 0 &&
    hdmi.every((version) => below(version ?? undefined, T.video.hdmiMinVersion)) &&
    !outputs.some((output) => T.video.modernKinds.includes(output.kind))
  );
};

export const PLATFORM_RULES: readonly FlagRule[] = [
  flagRule({
    id: ID.wifiOld,
    device: "any",
    fields: ["wifiGeneration"],
    severity: ({ wifiGeneration }) =>
      atMost(wifiGeneration, T.wifi.redMaxGeneration) ? "red" : "info",
    trips: ({ facts }) => atMost(facts.wifiGeneration, T.wifi.infoMaxGeneration),
    params: ({ facts }) => ({
      generation: facts.wifiGeneration,
      currentGeneration: T.wifi.currentGeneration,
    }),
  }),
  flagRule({
    id: ID.batterySmall,
    device: "laptop",
    fields: ["batteryWh"],
    severity: "amber",
    trips: ({ facts }) => below(facts.batteryWh, T.battery.minWh),
    params: ({ facts }) => ({ wh: facts.batteryWh }),
  }),
  flagRule({
    id: ID.modelOld,
    device: "any",
    fields: ["releaseYear"],
    severity: "amber",
    trips: ({ facts, now }) => atMost(facts.releaseYear, now.year - T.modelAgeYears),
    params: ({ facts, now }) => ({
      releaseYear: facts.releaseYear,
      yearsAgo: now.year - (facts.releaseYear ?? now.year),
    }),
  }),
  flagRule({
    id: ID.usb2Only,
    device: "any",
    fields: ["usbMaxGen"],
    severity: "red",
    trips: ({ facts }) => below(facts.usbMaxGen, T.usb.minGeneration),
    params: () => null,
  }),
  flagRule({
    id: ID.videoOutOld,
    device: "laptop",
    fields: ["videoOutputs"],
    severity: "info",
    trips: ({ facts }) => onlyOldHdmi(facts.videoOutputs),
    params: () => null,
  }),
  flagRule({
    id: ID.noOs,
    device: "any",
    fields: ["osKind"],
    severity: "info",
    trips: ({ facts }) => facts.osKind === "none",
    params: () => null,
  }),
];
