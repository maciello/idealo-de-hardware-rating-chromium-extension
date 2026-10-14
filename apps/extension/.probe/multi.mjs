import { chromium } from "@playwright/test";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--headless=new"] });
const page = await (await browser.newContext({ locale: "de-DE", userAgent: UA })).newPage();
const read = async (path) => {
  const r = await page.goto("https://www.idealo.de/preisvergleich/" + path, { waitUntil: "domcontentloaded", timeout: 45000 });
  const html = await page.content();
  const m = /window\.csr\.initialData\['searchResult'\]\s*=\s*"([A-Za-z0-9+/=]+)"/.exec(html);
  if (!m) return { path, status: r.status(), url: page.url(), payload: false };
  const d = JSON.parse(Buffer.from(m[1], "base64").toString("utf8"));
  return { path, status: r.status(), url: page.url().replace("https://www.idealo.de/preisvergleich/", ""), count: d.metadata?.search?.resultCount, selected: d.selectedFilters?.map((f) => f.id) };
};
const paths = process.argv.slice(2);
for (const p of paths) { console.log(JSON.stringify(await read(p))); await page.waitForTimeout(2500); }
await browser.close();
