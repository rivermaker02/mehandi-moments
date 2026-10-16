"""
Daily sync: Google Maps reviews for Geeth Mehandi Arts -> the testimonials Google Sheet.

Runs in GitHub Actions (.github/workflows/sync-reviews.yml). No one needs to touch it.

Why Apify: Google Maps shows logged-out visitors (and bots) only ~5 reviews, so a plain
browser scraper can't see the rest. Apify's maintained actor
`compass/google-maps-reviews-scraper` returns every review; it costs ~$0.30 per 1,000
reviews and Apify's free plan includes $5/month, so a daily run is effectively free.

How it works
  1. Calls the Apify actor for the place, newest reviews first.
  2. Upserts into Sheet1, keyed on Google's review id (column F):
       - new review id      -> appended as a new row
       - known review id    -> rating refreshed; truncated "…More"/empty text replaced
       - hand-typed rows    -> matched once by reviewer name, then given their review id
       - empty or profile-photo `link` -> replaced with the review's real URL
     It never edits `occasion` (D) or `hidden` (G); those are for humans.

Sheet columns (A-E are read by the website by position — don't reorder them):
  A name | B rating | C review | D occasion | E link | F review_id | G hidden | H review_date

Env vars
  GOOGLE_SERVICE_ACCOUNT_JSON  full JSON key of a service account that has Editor on the sheet
  APIFY_TOKEN                  Apify API token (Apify console -> Settings -> API & Integrations)
  SHEET_ID                     spreadsheet id
  SHEET_NAME                   tab name (default Sheet1)
  MAPS_URL                     Google Maps place URL (must contain /maps/place)
  FULL_SCAN=1                  fetch all reviews (first run / backfill); otherwise the newest 30
  DRY_RUN=1                    print what would change, don't write
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass

# Must be a /maps/place URL (the actor rejects maps.app.goo.gl short links).
# Don't hand-edit the `data=` part: its `!4m8!3m7` counters must match the fields that follow.
MAPS_URL = os.environ.get("MAPS_URL") or (
    "https://www.google.com/maps/place/Geeth+Mehandi+Arts/@12.9539648,77.4926682,17z/"
    "data=!3m1!5s0x3bae3e98f7e91a63:0x457424557f41f3e4!4m8!3m7!1s0x3bae3fa13894700b:"
    "0x860ea362dc78b97a!8m2!3d12.9539596!4d77.4952431!9m1!1b1!16s%2Fg%2F11lv53hfkj"
)
APIFY_ACTOR = "compass~google-maps-reviews-scraper"
MAX_REVIEWS_DAILY = 30
MAX_REVIEWS_FULL = 1000

HEADERS = ["name", "rating", "review", "occasion", "link", "review_id", "hidden", "review_date"]
C_NAME, C_RATING, C_REVIEW, C_OCC, C_LINK, C_ID, C_HIDDEN, C_DATE = range(8)
TRUNCATED = re.compile(r"…\s*More\s*$")


@dataclass
class Review:
    review_id: str
    name: str
    rating: int
    text: str
    date: str  # YYYY-MM-DD
    url: str = ""


# ---------------------------------------------------------------- fetching (Apify)

def fetch_reviews(full_scan: bool) -> list[Review]:
    token = os.environ["APIFY_TOKEN"]
    body = {
        "startUrls": [{"url": MAPS_URL}],
        "maxReviews": MAX_REVIEWS_FULL if full_scan else MAX_REVIEWS_DAILY,
        "reviewsSort": "newest",
        "language": "en",
        "reviewsOrigin": "google",
        "personalData": True,  # needed for reviewer name + review URL
    }
    url = (
        f"https://api.apify.com/v2/acts/{APIFY_ACTOR}/run-sync-get-dataset-items"
        "?format=json&clean=true"
    )
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    print(f"info: calling Apify ({body['maxReviews']} newest reviews max)")
    try:
        with urllib.request.urlopen(req, timeout=300) as res:
            items = json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:500]
        raise RuntimeError(f"Apify returned HTTP {e.code}: {detail}") from None
    print(f"info: Apify returned {len(items)} items")
    return [r for r in (to_review(i) for i in items) if r]


def to_review(item: dict) -> Review | None:
    rid = item.get("reviewId") or ""
    if not rid:
        return None
    return Review(
        review_id=rid,
        name=(item.get("name") or "").strip(),
        rating=int(item.get("stars") or 0),
        text=clean_text(item.get("text") or ""),
        date=(item.get("publishedAtDate") or "")[:10],
        url=item.get("reviewUrl") or "",
    )


def clean_text(s: str) -> str:
    s = s.strip()
    m = re.search(r"\(Original\)\s*([\s\S]*)$", s)  # Google-translated reviews: keep original
    return (m.group(1) if m else s).strip()


# ---------------------------------------------------------------- sheet upsert

def norm(s) -> str:
    return re.sub(r"\s+", " ", str(s or "")).strip().lower()


def pad(row: list, n: int = len(HEADERS)) -> list:
    return (list(row) + [""] * n)[:n]


def is_bad_link(s) -> bool:
    s = str(s or "").strip()
    return not s or "googleusercontent.com" in s


def merge(rows: list[list], reviews: list[Review]) -> tuple[list[list], list[list], int]:
    """Pure function: returns (updated existing rows, rows to append, number updated)."""
    rows = [pad(r) for r in rows]
    by_id = {str(r[C_ID]).strip(): i for i, r in enumerate(rows) if str(r[C_ID]).strip()}
    by_name: dict[str, int] = {}
    for i, r in enumerate(rows):
        if not str(r[C_ID]).strip():
            by_name.setdefault(norm(r[C_NAME]), i)

    appended, updated = [], 0
    seen: set[str] = set()
    for rv in reviews:
        if rv.review_id in seen:
            continue  # same review returned twice
        seen.add(rv.review_id)
        i = by_id.get(rv.review_id)
        if i is None:
            i = by_name.pop(norm(rv.name), None)
        if i is None:
            appended.append(
                [rv.name, rv.rating or "", rv.text, "", rv.url, rv.review_id, "", rv.date]
            )
            continue
        row, before = rows[i], list(rows[i])
        row[C_ID] = rv.review_id
        if rv.rating:
            row[C_RATING] = rv.rating
        cur = str(row[C_REVIEW] or "")
        if rv.text and (not cur.strip() or TRUNCATED.search(cur)):
            row[C_REVIEW] = rv.text
        if rv.url and is_bad_link(row[C_LINK]):
            row[C_LINK] = rv.url
        if rv.date and not re.match(r"\d{4}-\d{2}-\d{2}$", str(row[C_DATE]).strip()):
            row[C_DATE] = rv.date
        if [str(x) for x in row] != [str(x) for x in before]:
            updated += 1
    return rows, appended, updated


def open_sheet():
    import gspread

    creds = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"])
    gc = gspread.service_account_from_dict(creds)
    return gc.open_by_key(os.environ["SHEET_ID"]).worksheet(os.environ.get("SHEET_NAME", "Sheet1"))


def main() -> int:
    full_scan = os.environ.get("FULL_SCAN") == "1"
    dry_run = os.environ.get("DRY_RUN") == "1"

    ws = open_sheet()
    values = ws.get_all_values()
    header = pad(values[0] if values else [])
    rows = values[1:]
    if not any(str(pad(r)[C_ID]).strip() for r in rows):
        full_scan = True  # first run: backfill ids for the hand-typed rows

    reviews = fetch_reviews(full_scan)
    print(f"fetched {len(reviews)} reviews (full_scan={full_scan})")
    if not reviews:
        print("error: 0 reviews returned — check the Apify run in the Apify console.")
        return 1

    new_rows, appended, updated = merge(rows, reviews)
    print(f"updated {updated}, appending {len(appended)}")
    for r in appended:
        print("  +", r[C_NAME], "|", r[C_RATING], "|", r[C_REVIEW][:60])
    if dry_run:
        return 0

    header = [h or HEADERS[i] for i, h in enumerate(header)]  # fill missing headers only
    ws.update(range_name="A1", values=[header] + new_rows, value_input_option="RAW")
    if appended:
        ws.append_rows(appended, value_input_option="RAW")
    return 0


if __name__ == "__main__":
    sys.exit(main())
