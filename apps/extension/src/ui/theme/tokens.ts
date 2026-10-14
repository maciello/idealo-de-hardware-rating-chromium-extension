/** The only place colors, type sizes and radii are defined. Everything else reads these variables. */
export const TOKENS = {
  ink: "#0A3761",
  "ink-muted": "#4A6280",
  surface: "#FFFFFF",
  "surface-muted": "#F2F6FA",
  line: "#D5E0EB",
  accent: "#0E7C86",
  "accent-weak": "#CDEBED",
  focus: "#1F6FEB",
  /** Warning tag (older memory generation): dark amber text on a pale amber ground. */
  warn: "#8A4B00",
  "warn-weak": "#FFE9BF",
} as const;

/** Derived, not new colors: the hover shadow is the ink at low opacity. */
const DERIVED = {
  shadow: "0 1px 4px color-mix(in srgb, var(--hw-ink) 22%, transparent)",
  "shadow-card": "0 6px 20px color-mix(in srgb, var(--hw-ink) 18%, transparent)",
  "font-s": "12px",
  "font-m": "13px",
  "font-l": "15px",
  "radius-s": "6px",
  "radius-m": "8px",
} as const;

/** CSS custom properties for `selector` (`:host` in shadow roots, `:root` in extension pages). */
export const tokenCss = (selector: string): string =>
  `${selector}{${[...Object.entries(TOKENS), ...Object.entries(DERIVED)]
    .map(([name, value]) => `--hw-${name}:${value};`)
    .join("")}}`;

/** Font stack of the extension's own pages (popup, options); overlays inherit the host page's font. */
export const PAGE_FONT_FAMILY = "Roboto, system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Browsers size the popup to its content; this is the fixed width of that content. */
export const POPUP_WIDTH = "360px";
