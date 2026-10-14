import { cleanText, stripNameDecoration } from "../../identity";

/** PassMark appends edition words and clock decorations that are not part of the chip. */
export const plainName = (name: string): string =>
  stripNameDecoration(cleanText(name))
    .text.replace(/\b(radeon|core)\s?t?m?(?=\s)/g, "$1")
    .replace(/\s+(?:microsoft surface edition|creator edition|mobile)$/, "");
