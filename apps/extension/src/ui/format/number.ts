const NUMBER = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** de-DE, so numbers read like idealo's prices next to them: 9.986 and 17,6. */
export const formatInteger = (value: number): string => NUMBER.format(value);
export const formatDecimal = (value: number): string => DECIMAL.format(value);

const TRIMMED = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

/** de-DE with up to two decimals and no trailing zeros: 16, 1,4, 0,35. */
export const formatTrimmed = (value: number): string => TRIMMED.format(value);

const TENTHS = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

/** de-DE with at most one decimal and no trailing zeros: 8, 9,5, 1.080. */
export const formatTenths = (value: number): string => TENTHS.format(value);
