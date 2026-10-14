const NUMBER = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

export const formatInteger = (value: number): string => NUMBER.format(value);
export const formatDecimal = (value: number): string => DECIMAL.format(value);
