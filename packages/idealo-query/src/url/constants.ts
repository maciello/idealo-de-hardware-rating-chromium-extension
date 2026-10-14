export const DEFAULT_ORIGIN = "https://www.idealo.de";

export const CATEGORY_PATH = /^\/preisvergleich\/ProductCategory\/(.+)\.html$/;
export const CATEGORY_SEGMENT = /^(\d+)(?:F(\d+(?:-\d+)*))?(?:I16-(\d+))?([A-Za-z][A-Za-z0-9]*)?$/;
export const PRODUCT_PATH = /^\/preisvergleich\/OffersOfProduct\/(\d+)(?:_(.*))?\.html$/;
/** Pathname of idealo's free-text search page. */
export const SEARCH_PATHNAME = "/preisvergleich/MainSearchProductCategory.html";
export const SEARCH_PATH = new RegExp(`^${SEARCH_PATHNAME.replaceAll(".", String.raw`\.`)}$`);
export const HOST = /(^|\.)idealo\.[a-z]{2,}$/;
