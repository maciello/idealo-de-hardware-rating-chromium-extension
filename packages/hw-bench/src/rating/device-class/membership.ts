import type { DeviceMembership } from "./model";

export const LAPTOP = (rule: string): DeviceMembership => ({
  laptop: true,
  desktop: false,
  status: "member",
  rule,
});
export const DESKTOP = (rule: string): DeviceMembership => ({
  laptop: false,
  desktop: true,
  status: "member",
  rule,
});
export const BOTH = (rule: string): DeviceMembership => ({
  laptop: true,
  desktop: true,
  status: "member",
  rule,
});
export const EXCLUDED = (rule: string): DeviceMembership => ({
  laptop: false,
  desktop: false,
  status: "excluded",
  rule,
});
export const UNCLASSIFIED: DeviceMembership = {
  laptop: false,
  desktop: false,
  status: "unclassified",
  rule: "none",
};

/** One named entry of an ordered rule table; the first rule whose `test` matches decides. */
export interface NameRule {
  readonly rule: string;
  readonly result: "laptop" | "desktop" | "both" | "excluded";
  readonly test: RegExp;
}

const fromRule = ({ rule, result }: NameRule): DeviceMembership =>
  result === "laptop"
    ? LAPTOP(rule)
    : result === "desktop"
      ? DESKTOP(rule)
      : result === "both"
        ? BOTH(rule)
        : EXCLUDED(rule);

/** The membership of the first rule that matches `text`, or null when no rule does. Table order is behavior. */
export const byRules = (rules: readonly NameRule[], text: string): DeviceMembership | null => {
  const hit = rules.find(({ test }) => test.test(text));
  return hit === undefined ? null : fromRule(hit);
};
