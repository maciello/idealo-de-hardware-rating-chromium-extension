const NUMBER = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** de-DE, so numbers read like idealo's prices next to them: 9.986 and 17,6. */
export const formatInteger = (value: number): string => NUMBER.format(value);
export const formatDecimal = (value: number): string => DECIMAL.format(value);
