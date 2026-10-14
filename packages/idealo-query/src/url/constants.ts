export const DEFAULT_ORIGIN = "https://www.idealo.de";

export const CATEGORY_PATH = /^\/preisvergleich\/ProductCategory\/(.+)\.html$/;
export const CATEGORY_SEGMENT = /^(\d+)(?:F(\d+(?:-\d+)*))?(?:I16-(\d+))?([A-Za-z][A-Za-z0-9]*)?$/;
export const PRODUCT_PATH = /^\/preisvergleich\/OffersOfProduct\/(\d+)(?:_(.*))?\.html$/;
export const SEARCH_PATH = /^\/preisvergleich\/MainSearchProductCategory\.html$/;
export const HOST = /(^|\.)idealo\.[a-z]{2,}$/;
