import type { IgpuRule } from "../../model";
import { AMD_DESKTOP_APU_RULES } from "./desktop-apu";
import { AMD_DESKTOP_RAPHAEL_TO_STRIX_HALO_RULES } from "./desktop-raphael-to-strix-halo";
import { AMD_NO_GRAPHICS_RULES } from "./no-graphics";
import { AMD_RAVEN_TO_EMBEDDED_RULES } from "./raven-to-embedded";
import { AMD_REMBRANDT_TO_BARCELO_RULES } from "./rembrandt-to-barcelo";
import { AMD_RYZEN_100_200_TO_PHOENIX_RULES } from "./ryzen-100-200-to-phoenix";
import { AMD_STRIX_POINT_RULES } from "./strix-point";
import { AMD_ZEN3_RENOIR_RULES } from "./zen3-renoir";

/** In evaluation order. */
export const AMD_RULES: readonly IgpuRule[] = [
  ...AMD_NO_GRAPHICS_RULES,
  ...AMD_DESKTOP_APU_RULES,
  ...AMD_DESKTOP_RAPHAEL_TO_STRIX_HALO_RULES,
  ...AMD_STRIX_POINT_RULES,
  ...AMD_RYZEN_100_200_TO_PHOENIX_RULES,
  ...AMD_REMBRANDT_TO_BARCELO_RULES,
  ...AMD_ZEN3_RENOIR_RULES,
  ...AMD_RAVEN_TO_EMBEDDED_RULES,
];
