const NUMBER = String.raw`(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}|-))?`;
const ANY = new RegExp(NUMBER);
const WITH_CURRENCY = new RegExp(String.raw`${NUMBER}\s*(?:€|EUR)`, "g");

const toNumber = (integer: string, decimals: string | undefined): number =>
  Number(`${integer.replaceAll(".", "")}.${decimals && decimals !== "-" ? decimals : "0"}`);

/**
 * Parses German-formatted money ("1.299,00 €", "ab 499,- €", "89,9"). With `requireCurrency`
 * only numbers directly followed by € / EUR count, so "16 GB 1.299,00 €" yields 1299.
 */
export function parseGermanPrice(text: string, requireCurrency = false): number | undefined {
  const match = requireCurrency ? text.matchAll(WITH_CURRENCY).next().value : ANY.exec(text);
  const [, integer, decimals] = match ?? [];
  return integer === undefined ? undefined : toNumber(integer, decimals);
}
