import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regenerates listing.idealo-ssr.html: real tile markup (idealo-ssr/tiles.html, category 3751) plus
 * the inline script idealo's server render ships, with the trimmed payload (idealo-ssr/payload.json)
 * base64-encoded the way the site does. Run with `pnpm --filter @idealo-hw/idealo-page fixtures`.
 */
const here = import.meta.dirname;
const read = (name: string): string => readFileSync(resolve(here, name), "utf8");

const CATEGORY_ID = "3751";
const payload = Buffer.from(JSON.stringify(JSON.parse(read("idealo-ssr/payload.json")))).toString(
  "base64",
);

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>idealo SSR listing fixture</title></head>
<body>
<script data-csr-component="SearchResult">
window.csr = window.csr || {};
window.csr.initialData = window.csr.initialData || {};
window.csr.initialData['searchResult'] = "${payload}";window.csr.initialData['locale'] = "de_DE";window.csr.initialData['categoryId'] = "${CATEGORY_ID}";
</script>
${read("idealo-ssr/tiles.html")}</body></html>
`;

writeFileSync(resolve(here, "listing.idealo-ssr.html"), html);
