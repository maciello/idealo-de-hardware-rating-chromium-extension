# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx[brotli]>=0.28", "tenacity>=9"]
# ///
"""Fetch PassMark CPU/GPU megapage data into <out_dir>/passmark_{cpu,gpu}.json.

Two-step session: GET the mega page (sets PHPSESSID), then GET /data/ on the same
client. Without the cookie /data/ returns {"data": []} with HTTP 200.
Private use only: docs/adr/0006-benchmark-data-licensing.yaml.
"""

import json
import sys
import time
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

SOURCES = {
    "cpu": ("https://www.cpubenchmark.net/CPU_mega_page.html", "https://www.cpubenchmark.net/data/"),
    "gpu": ("https://www.videocardbenchmark.net/GPU_mega_page.html", "https://www.videocardbenchmark.net/data/"),
}

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "sec-ch-ua": '"Not-A.Brand";v="24", "Chromium";v="146"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=16), reraise=True)
def fetch_data(page_url: str, data_url: str) -> list[dict]:
    with httpx.Client(follow_redirects=True, timeout=30) as client:
        client.get(page_url, headers={
            **BROWSER_HEADERS,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
        }).raise_for_status()
        resp = client.get(data_url, params={"_": str(int(time.time() * 1000))}, headers={
            **BROWSER_HEADERS,
            "Referer": page_url,
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
        })
    resp.raise_for_status()
    records = resp.json()["data"]
    if not records:
        raise RuntimeError(f"empty data list from {data_url}: session cookie missing or site changed")
    return records


def main() -> None:
    out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "data")
    out_dir.mkdir(parents=True, exist_ok=True)
    for kind, (page_url, data_url) in SOURCES.items():
        records = fetch_data(page_url, data_url)
        path = out_dir / f"passmark_{kind}.json"
        path.write_text(json.dumps({"data": records}), encoding="utf-8")
        print(f"{kind}: {len(records)} records -> {path}")


if __name__ == "__main__":
    main()
