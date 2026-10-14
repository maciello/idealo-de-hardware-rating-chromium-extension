import {
  createTheme,
  type MantineColorsTuple,
  type MantineThemeComponents,
  type MantineThemeOverride,
} from "@mantine/core";
import { TOKENS } from "./tokens";

/** Teal ramp around the accent token; index 6 is the accent, index 1 the accent-weak token. */
const ACCENT_RAMP: MantineColorsTuple = [
  "#E8F5F6",
  TOKENS["accent-weak"],
  "#A9DDE0",
  "#7FCBD0",
  "#4DB3BA",
  "#2A9AA3",
  TOKENS.accent,
  "#0B6A73",
  "#08585F",
  "#06464C",
];

/** Mantine theme shared by the injected overlay and the extension pages (tokens, no ad-hoc colors). */
export const createHwTheme = (
  fontFamily: string,
  components?: MantineThemeComponents,
): MantineThemeOverride =>
  createTheme({
    primaryColor: "hw",
    colors: { hw: ACCENT_RAMP },
    black: TOKENS.ink,
    white: TOKENS.surface,
    fontFamily,
    defaultRadius: "sm",
    // Only 12, 13 and 15 px exist in this UI.
    fontSizes: { xs: "12px", sm: "13px", md: "13px", lg: "15px", xl: "15px" },
    respectReducedMotion: true,
    focusRing: "auto",
    ...(components ? { components } : {}),
  });
