const MEGABYTES = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

/** Decimal megabytes (1 MB = 1,000,000) with one de-DE fraction digit at most: `1,2`. */
export const formatMegabytes = (bytes: number): string => MEGABYTES.format(bytes / 1_000_000);
