import { cleanText, stripNameDecoration } from "../identity/text";

/** Resolutions ("2560x1440") and number-plus-unit specs that mix letters and digits but name no CPU. */
const NOT_A_MODEL =
  /^(?:\d{3,4}x\d{3,4}|\d+(?:gb|tb|mb|ghz|mhz|hz|w|wh|mah|p|i|k|fps|mm|cm|kg|nits|nm))$/;

/** A token right after one of these words names a graphics chip ("RTX 4060Ti", "Radeon RX 6800M"), not a CPU. */
const AFTER_GPU_WORD =
  /(?<![a-z0-9])(?:nvidia|geforce|rtx|gtx|gts|gt|mx|fx|nvs|quadro|firepro|radeon|rx|igp|arc|iris|uhd|hd|graphics|gpu|r[579]|(?:iris|radeon|quadro)\s+pro)[\s-]*$/;

/** Letters and digits only, at least one letter, at least three digits: never a pure number, a capacity or a resolution. */
const isBareModelToken = (token: string): boolean =>
  /^[a-z0-9]+$/.test(token) &&
  /[a-z]/.test(token) &&
  (token.match(/\d/g)?.length ?? 0) >= 3 &&
  !NOT_A_MODEL.test(token);

/**
 * Model tokens of free text, e.g. "N5095-CPU" -> ["n5095"]. A token whose every occurrence directly follows a
 * graphics-chip word is dropped. `decorated` is true when a PassMark-style "with Radeon ..." tail was cut off first.
 */
export function bareModelTokens(text: string): { tokens: string[]; decorated: boolean } {
  const stripped = stripNameDecoration(cleanText(text));
  const tokens = new Set<string>();
  for (const m of stripped.text.matchAll(/[a-z0-9]+/g)) {
    if (isBareModelToken(m[0]) && !AFTER_GPU_WORD.test(stripped.text.slice(0, m.index))) {
      tokens.add(m[0]);
    }
  }
  return { tokens: [...tokens], decorated: stripped.decorated };
}
