import type { VideoOutput } from "../model";
import { listItems, maxMatch, type Reader } from "../text";

const USB_C = /\busb[\s-]?(?:typ[\s-]?|type[\s-]?)?c\b/i;
const USB_VERSION = /\busb\s*([1-4])(?!\d)/i;
const THUNDERBOLT = /thunderbolt/i;

const THUNDERBOLT_GEN = 4;
const USB_C_GEN = 3;

/** One list item: an explicit USB version, else USB-C as 3, Thunderbolt as 4; null when it says neither. */
const usbGenerationOf = (item: string): number | null => {
  if (THUNDERBOLT.test(item)) return THUNDERBOLT_GEN;
  const version = USB_VERSION.exec(item)?.[1];
  if (version !== undefined) return Number(version);
  return USB_C.test(item) ? USB_C_GEN : null;
};

/**
 * Anschlüsse and Frontanschlüsse: "2 x USB 3.2, 1 x USB Typ-C, Kopfhörerausgang". A list that names
 * only unversioned USB says nothing about the generation.
 */
export const readUsb: Reader = (values) => {
  const generation = maxMatch(values, (value) => {
    const found = listItems(value).flatMap((item) => usbGenerationOf(item) ?? []);
    return found.length === 0 ? null : Math.max(...found);
  });
  return generation === null ? {} : { usbMaxGen: generation };
};

const HDMI_VERSION = /hdmi\D{0,6}(\d(?:[.,]\d)?)/i;

const OUTPUT_PATTERNS: readonly (readonly [RegExp, (item: string) => VideoOutput])[] = [
  [THUNDERBOLT, () => ({ kind: "thunderbolt" })],
  [/displayport|\bdp\b/i, () => ({ kind: "displayport" })],
  [USB_C, () => ({ kind: "usb_c" })],
  [
    /hdmi/i,
    (item) => {
      const version = HDMI_VERSION.exec(item)?.[1];
      return {
        kind: "hdmi",
        version: version === undefined ? null : Number(version.replace(",", ".")),
      };
    },
  ],
  [/vga|d-?sub/i, () => ({ kind: "vga" })],
  [/\bdvi\b/i, () => ({ kind: "dvi" })],
];

const outputOf = (item: string): VideoOutput[] => {
  const entry = OUTPUT_PATTERNS.find(([pattern]) => pattern.test(item));
  return entry === undefined ? [] : [entry[1](item)];
};

/** Videoausgang and Videoausgänge: "Thunderbolt 4, HDMI 2.1", "VGA, DisplayPort, HDMI". */
export const readVideoOutputs: Reader = (values) => {
  const outputs = values.flatMap((value) => listItems(value).flatMap(outputOf));
  return outputs.length === 0 ? {} : { videoOutputs: outputs };
};
