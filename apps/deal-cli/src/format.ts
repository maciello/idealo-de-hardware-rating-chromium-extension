const NBSP = / | /g;

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const plain = (digits: number) =>
  new Intl.NumberFormat("de-DE", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
const percent = new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 0 });

const clean = (text: string): string => text.replace(NBSP, " ");

/** 1.299,00 € */
export const formatEuro = (value: number): string => clean(euro.format(value));

/** German number with at most `digits` decimals: 1.234,5 */
export const formatNumber = (value: number, digits = 1): string =>
  clean(plain(digits).format(value));

/** A ratio as a whole percent: 0.123 -> 12 % */
export const formatPercent = (ratio: number): string => clean(percent.format(ratio));
