import { cleanText, slugify, stripNameDecoration } from "../text";

/** Generic key for any name: marks, "@ x GHz", case and separators removed. */
export function normalizeCpuName(text: string): string {
  return slugify(stripNameDecoration(cleanText(text)).text);
}

/** Vendors PassMark sometimes leaves off a name ("Snapdragon 7c @ 2.40 GHz") that listings prefix ("Qualcomm Snapdragon 7c"). */
const LEADING_VENDOR = /^(?:qualcomm|mediatek|intel|amd|nvidia|apple)\s+/;

/** `normalizeCpuName` without a leading vendor word; the fallback key for names that carry no identity. */
export function normalizeCpuNameWithoutVendor(text: string): string {
  return slugify(stripNameDecoration(cleanText(text)).text.replace(LEADING_VENDOR, ""));
}
