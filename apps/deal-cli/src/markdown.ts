import type { DealReport, OfferView, PriceContext, RankedCandidate } from "@idealo-hw/deal-rank";
import { featureLabel, flagText, metricLabel, reasonText } from "./describe";
import { formatEuro, formatNumber, formatPercent } from "./format";
import { cellText, topTable } from "./table";

const offerLine = (offer: OfferView): string => {
  const rating =
    offer.rating_avg === null
      ? "no rating"
      : `rating ${formatNumber(offer.rating_avg, 1)} from ${formatNumber(offer.rating_count ?? 0, 0)}`;
  const kind = offer.marketplace ? ", marketplace" : "";
  const payments = offer.payments.length === 0 ? "none listed" : offer.payments.join(", ");
  return `${offer.shop}: ${formatEuro(offer.price_eur)} + ${formatEuro(offer.shipping_eur)} shipping = ${formatEuro(offer.total_eur)} (${rating}${kind}; payment: ${payments})`;
};

function priceLines(price: PriceContext | null): string[] {
  if (price === null) return ["- Price context: no price history."];
  const dips =
    price.dips.length === 0
      ? "no dips"
      : `${price.dips.length} dip${price.dips.length === 1 ? "" : "s"} (lowest ${formatEuro(Math.min(...price.dips.map((d) => d.value)))})`;
  return [
    `- Price history (${formatNumber(price.points, 0)} points): low ${formatEuro(price.low)}, median ${formatEuro(price.median)}, high ${formatEuro(price.high)}; trend ${price.trend}; ${dips}.`,
    `- Best price is ${formatPercent(price.pct_above_low)} above the low.${price.badge_inflated ? " The bargain badge is not backed by the price." : ""}`,
  ];
}

function candidateSection(r: RankedCandidate, report: DealReport): string {
  const custom = Object.fromEntries(report.custom_metrics.map((m) => [m.key, m.label]));
  const lenses = Object.fromEntries(report.lens_view.map((l) => [l.id, l.label]));
  const show = (metric: string, value: number): string =>
    metric === "price" ? formatEuro(value) : formatNumber(value, 2);
  const standouts = r.standouts.map(
    (s) =>
      `${metricLabel(s.metric, custom)} ${show(s.metric, s.value)} (next best ${show(s.metric, s.runner_up)})`,
  );
  const lines = [
    `### ${r.rank}. [${cellText(r.name)}](${r.url})`,
    "",
    `Score ${formatNumber(r.score, 1)} of 100. SKU ${r.sku}, type ${r.product_type}.`,
    "",
    `- Standouts: ${standouts.length === 0 ? "none" : standouts.join("; ")}.`,
    `- Rare features: ${r.rare_features.length === 0 ? "none" : r.rare_features.map(featureLabel).join(", ")}.`,
    ...(r.ai_memory_basis === "none" || r.metrics.ai_memory_gb === undefined
      ? []
      : [
          `- AI memory: ${formatNumber(r.metrics.ai_memory_gb, 0)} GB (estimate, ${r.ai_memory_basis.replaceAll("_", " ")}).`,
        ]),
    ...(r.red_flags.length === 0
      ? ["- Red flags: none."]
      : ["- Red flags:", ...r.red_flags.map((f) => `  - ${flagText(f)}`)]),
    ...priceLines(r.price_context),
    `- Best offer: ${offerLine(r.best_offer)}.`,
    ...(r.trusted_offer !== null && r.trusted_offer.shop !== r.best_offer.shop
      ? [`- Trusted offer: ${offerLine(r.trusted_offer)}.`]
      : []),
    `- Found by: ${r.found_by.map((id) => lenses[id] ?? id).join(", ")}.`,
    ...(r.notes.length === 0 ? [] : ["- Agent notes:", ...r.notes.map((n) => `  - ${n}`)]),
    ...(r.system_notes.length === 0 ? [] : [`- Ranking notes: ${r.system_notes.join("; ")}.`]),
  ];
  return lines.join("\n");
}

function lensSection(report: DealReport): string[] {
  if (report.lens_view.length === 0 && report.unknown_lens_ids.length === 0) return [];
  return [
    "## Search angles",
    "",
    ...report.lens_view.flatMap((lens) => [
      `### ${lens.label}`,
      "",
      `Found ${lens.found}, eligible ${lens.eligible}.`,
      "",
      ...(lens.top.length === 0
        ? ["No eligible candidate."]
        : lens.top.map(
            (t) => `${t.rank}. ${cellText(t.name)} (score ${formatNumber(t.score, 1)})`,
          )),
      "",
    ]),
    ...(report.unknown_lens_ids.length === 0
      ? []
      : [
          `Candidates reference lens ids the wants file does not define: ${report.unknown_lens_ids.join(", ")}.`,
          "",
        ]),
  ];
}

function excludedSection(report: DealReport): string[] {
  return [
    "## Excluded",
    "",
    ...(report.excluded.length === 0
      ? ["None."]
      : [
          "| Product | Reasons |",
          "| --- | --- |",
          ...report.excluded.map(
            (e) => `| [${cellText(e.name)}](${e.url}) | ${e.reasons.map(reasonText).join(" ")} |`,
          ),
        ]),
    "",
  ];
}

/** report.md: summary, top-N table, per-candidate detail, search angles, exclusions. */
export function renderMarkdown(report: DealReport): string {
  const { summary } = report;
  const top = report.ranked.slice(0, report.top_n);
  return [
    "# Deal ranking",
    "",
    `${summary.candidates} candidates, ${summary.eligible} eligible, ${summary.excluded} excluded, ${summary.lenses} search angles.`,
    "",
    top.length === 0 ? "No candidate passed the filters." : `## Top ${top.length}`,
    "",
    ...(top.length === 0 ? [] : [topTable(report), "", "## Details", ""]),
    ...top.flatMap((r) => [candidateSection(r, report), ""]),
    ...lensSection(report),
    ...excludedSection(report),
  ].join("\n");
}
