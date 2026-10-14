import type { FacetPlan } from "@idealo-hw/idealo-query";

const NOUN: Readonly<Record<string, string>> = { cpu_model: "CPUs", gpu_model: "GPUs" };

const options = (n: number): string => `${n} ${n === 1 ? "option" : "options"}`;

/** One short line per requirement: what the plan did with it. Null when there is nothing to say. */
export function statusLine(plan: FacetPlan | undefined): string | null {
  if (plan === undefined) return null;
  if (plan.status === "not_expressible") return "not filterable here";
  const noun = NOUN[plan.facet];
  const cap =
    plan.capped && noun !== undefined ? `100-option cap: unlisted ${noun} excluded` : null;
  const main =
    plan.status === "applied"
      ? `${options(plan.selected.length)}${plan.partial.length > 0 ? `, ${plan.partial.length} partly` : ""}`
      : plan.status === "unconstrained"
        ? "every option meets this"
        : "no listed option meets this";
  return cap === null ? main : `${main} · ${cap}`;
}
