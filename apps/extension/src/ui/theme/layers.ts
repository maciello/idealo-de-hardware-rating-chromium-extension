/** Above everything else inside the overlay; the overlay itself is the topmost layer of the page. */
export const Z_INDEX = 2_147_483_000;

/** The overlay's shadow host: the maximum z-index, so it sits over any page content. */
export const OVERLAY_HOST_Z_INDEX = 2_147_483_647;

/** Prefix of every custom element and shadow host the extension injects into idealo pages. */
export const HOST_TAG_PREFIX = "idealo-hw-";
