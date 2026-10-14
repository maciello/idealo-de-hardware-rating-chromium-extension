import { groupKey } from "@idealo-hw/idealo-query";
import type { Reader } from "../text";
import { readResolution, readTechnology } from "./display";
import { readUsb, readVideoOutputs } from "./ports";
import { readStorageKind } from "./storage";
import { readBattery, readOs } from "./system";
import { readCamera, readEquipment } from "./webcam";
import { readWifi } from "./wifi";

/**
 * A datasheet label that is not a filter facet, with the reader for its values. Labels with a
 * numeric facet (RAM, SSD-Speicher, Helligkeit, Markteinführung) go through idealo-query instead.
 */
export interface LabelEntry {
  /** Normalized with the filter catalog's group key. */
  readonly keys: ReadonlySet<string>;
  readonly read: Reader;
  /** The reader also recognizes a bare listing-tile value ("Full HD", "Windows 11 Home"). */
  readonly bare: boolean;
}

const entry = (labels: readonly string[], read: Reader, bare = false): LabelEntry => ({
  keys: new Set(labels.map(groupKey)),
  read,
  bare,
});

/** Earlier entries win a fact both state, so the exact pixel grid beats the technology name. */
export const LABEL_TABLE: readonly LabelEntry[] = [
  entry(["Displayauflösung"], readResolution),
  entry(["Display-Technologie"], readTechnology, true),
  entry(["Festplattentyp"], readStorageKind, true),
  entry(["WLAN-Standard", "WLAN-Standards"], readWifi, true),
  entry(["Wattstunden"], readBattery),
  entry(["Anschlüsse", "Frontanschlüsse"], readUsb),
  entry(["Videoausgang", "Videoausgänge"], readVideoOutputs),
  entry(["Betriebssystem"], readOs, true),
  entry(["Webcam", "Kamerafunktion", "Kameraauflösung"], readCamera),
  entry(["Ausstattung"], readEquipment),
];
