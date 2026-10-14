import type { WebcamFact } from "../model";
import { clean, listItems, type Reader, shortSideOf } from "../text";

const ABSENT = /^(?:nein|keine?|ohne|nicht vorhanden)$|(?:ohne|keine?)\s+(?:\w+\s+)?(?:web)?cam/i;
const INFRARED = /\bir[\s-]?(?:kamera|camera|webcam)|infrarot/i;
const MEGAPIXELS = /(\d+(?:[.,]\d+)?)\s*(?:mp|megapixel)\b/i;
/** An Ausstattung list item that talks about the camera. */
const CAMERA_ITEM = /web\s*cam|kamera|camera|infrarot/i;

const IR_CAMERA: { irCamera: true } = { irCamera: true };

const megapixelsOf = (item: string): number | undefined => {
  const text = MEGAPIXELS.exec(item)?.[1];
  const value = text === undefined ? Number.NaN : Number(text.replace(",", "."));
  return value > 0 ? value : undefined;
};

/**
 * Reads the camera from list items. One item stating a camera makes it present; a stated absence
 * only counts when nothing states a camera, so a stray "nein" never hides a resolution.
 */
function webcamOf(items: readonly string[]): WebcamFact | null {
  const absent = items.some((item) => ABSENT.test(item));
  const present = items.filter((item) => !ABSENT.test(item));
  if (present.length === 0) return absent ? { present: false } : null;
  const heightPx = present.flatMap((item) => shortSideOf(item) ?? [])[0];
  const megapixels = present.flatMap((item) => megapixelsOf(item) ?? [])[0];
  return {
    present: true,
    ...(heightPx === undefined ? {} : { heightPx }),
    ...(megapixels === undefined ? {} : { megapixels }),
    ...(present.some((item) => INFRARED.test(item)) ? IR_CAMERA : {}),
  };
}

/**
 * Webcam, Kamerafunktion and Kameraauflösung describe the camera in every value ("integriert",
 * "5.0 Megapixel", "HD-fähig", "1280 x 720 Pixel"), so any value that is not a negation means one exists.
 */
export const readCamera: Reader = (values) => {
  const webcam = webcamOf(values.map(clean).filter((value) => value !== ""));
  return webcam === null ? {} : { webcam };
};

/**
 * Ausstattung is a comma list of many features; only the items naming a camera count. Silence is
 * not absence: a list without a camera item states nothing.
 */
export const readEquipment: Reader = (values) => {
  const webcam = webcamOf(values.flatMap(listItems).filter((item) => CAMERA_ITEM.test(item)));
  return webcam === null ? {} : { webcam };
};
