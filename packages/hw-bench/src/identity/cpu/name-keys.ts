import { cleanText, slugify, stripNameDecoration } from "../text";
import { findFound, findIdentity } from "./extract";
import type { CpuIdentity } from "./model";

/** Sub-brand words that follow the family in PassMark names ("Pentium Silver N6000") but that listings often drop. */
const OPTIONAL_SUB_BRAND = /^(Pentium|Athlon) (?:Silver|Gold)$/;

/**
 * "MediaTek Kompanio 520-528 (MT8186-MT8186T)": PassMark folds the models sold under both numbers into one record and
 * writes the range with a hyphen. Both listed numbers are covered, nothing in between: the key of the last number.
 * Only for purely numeric models of equal length, so suffix letters never join a range.
 */
function rangeEnd(rest: string, identity: CpuIdentity): string | null {
  const m = /^-(\d+)(?![a-z0-9+])/.exec(rest);
  const last = m?.[1];
  if (
    last === undefined ||
    !/^\d+$/.test(identity.model) ||
    last.length !== identity.model.length
  ) {
    return null;
  }
  return Number(last) > Number(identity.model) && identity.key.endsWith(identity.model)
    ? identity.key.slice(0, -identity.model.length) + last
    : null;
}

export interface CpuNameKey {
  readonly key: string;
  /**
   * 0 = the name itself; 1 = PassMark appended "with Radeon ..."; +2 = the name only starts with the model
   * ("Ryzen 7 4850U Mobile"). On equal keys the lowest penalty wins, so plain names beat decorated ones.
   */
  readonly penalty: number;
}

/**
 * Index keys for a PassMark CPU name: the generic key, the structural key when the whole name is a
 * recognised model, and (with a penalty) the structural key when the name merely starts with one.
 */
export function cpuNameKeys(name: string): readonly CpuNameKey[] {
  const stripped = stripNameDecoration(cleanText(name));
  const base = stripped.decorated ? 1 : 0;
  const keys = new Map<string, number>();
  const add = (key: string, penalty: number): void => {
    keys.set(key, Math.min(keys.get(key) ?? penalty, penalty));
  };
  add(slugify(stripped.text), base);
  const whole = findIdentity(stripped.text, "whole");
  if (whole !== null) {
    add(whole.key, base);
    if (whole.coreAgnosticKey !== null) add(whole.coreAgnosticKey, base);
    if (/^Core [357]$/.test(whole.family) && /^N\d{3}$/.test(whole.model)) {
      add(slugify(`Intel Core ${whole.model}`), base);
    }
    // "Pentium Silver N6000" is also "Pentium N6000"; losing against a record that is named so, and ambiguous if two sub-brands share the number.
    const brand = OPTIONAL_SUB_BRAND.exec(whole.family);
    if (brand?.[1] !== undefined)
      add(slugify(`${whole.vendor} ${brand[1]} ${whole.model}`), base + 1);
  } else {
    const prefix = findFound(stripped.text, "prefix");
    if (prefix !== null) {
      add(prefix.identity.key, base + 2);
      const last = rangeEnd(stripped.text.slice(prefix.end), prefix.identity);
      if (last !== null) add(last, base + 2);
    }
  }
  return [...keys].map(([key, penalty]) => ({ key, penalty }));
}
