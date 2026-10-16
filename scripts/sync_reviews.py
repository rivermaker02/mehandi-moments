"""
Daily sync: Google Maps reviews for Geeth Mehandi Arts -> the testimonials Google Sheet.

Runs in GitHub Actions (.github/workflows/sync-reviews.yml). No one needs to touch it.

How it works
  1. Opens the Maps place page in headless Chromium (Playwright), switches to the
     Reviews tab, sorts by Newest, scrolls, expands "More", and reads each review.
  2. Upserts into Sheet1, keyed on Google's review id (column F):
       - new review id      -> appended as a new row
       - known review id    -> rating/date refreshed; truncated "…More"/empty text replaced
       - hand-typed rows    -> matched once by reviewer name, then given their review id
     It never edits `occasion` (D) or `hidden` (G); those are for humans.

Sheet columns (A-E are read by the website by position — don't reorder them):
  A name | B rating | C review | D occasion | E link | F review_id | G hidden | H review_date

Env vars
  GOOGLE_SERVICE_ACCOUNT_JSON  full JSON key of a service account that has Editor on the sheet
  SHEET_ID                     spreadsheet id
  SHEET_NAME                   tab name (default Sheet1)
  MAPS_URL                     Maps place URL (default below)
  FULL_SCAN=1                  scroll through all reviews (first run / backfill);
                               otherwise stops once it reaches reviews already in the sheet
  DRY_RUN=1                    print what would change, don't write
"""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass

MAPS_URL = os.environ.get(
    "MAPS_URL",
    "https://www.google.com/maps/place/Geeth+Mehandi+Arts/"
    "@12.9539596,77.4952431,17z/data=!4m8!3m7!1s0x3bae3fa13894700b:0x860ea362dc78b97a"
    "!8m2!3d12.9539596!4d77.4952431!9m1!1b1",
)
HEADERS = ["name", "rating", "review", "occasion", "link", "review_id", "hidden", "review_date"]
C_NAME, C_RATING, C_REVIEW, C_OCC, C_LINK, C_ID, C_HIDDEN, C_DATE = range(8)
TRUNCATED = re.compile(r"…\s*More\s*$")
MAX_SCROLLS_FULL = 80
MAX_SCROLLS_INCREMENTAL = 6


@dataclass
class Review:
    review_id: str
    name: str
    rating: int
    text: str
    date: str  # Google only shows relative dates ("2 weeks ago"); stored as-is on first sight


# ---------------------------------------------------------------- scraping

# Selectors. Google renames CSS classes from time to time; when the job starts failing,
# these are the lines to fix. data-review-id and aria-labels are the most stable hooks.
SEL_REVIEW = "div[data-review-id][aria-label]"
SEL_NAME = ".d4r55"
SEL_STARS = "span[role='img'][aria-label*='star' i]"
SEL_TEXT = ".wiI7pd"
SEL_DATE = ".rsqaWe"
SEL_MORE = "button.w8nwRe"


def extract_reviews(page) -> list[Review]:
    """Read all review cards currently rendered on the page."""
    for btn in page.query_selector_all(SEL_MORE):  # expand truncated reviews
        try:
            btn.click(timeout=1000)
        except Exception:
            pass
    page.wait_for_timeout(300)

    out: dict[str, Review] = {}
    for card in page.query_selector_all(SEL_REVIEW):
        rid = card.get_attribute("data-review-id") or ""
        if not rid or rid in out:
            continue
        name_el = card.query_selector(SEL_NAME)
        name = (name_el.inner_text() if name_el else card.get_attribute("aria-label") or "").strip()
        stars_el = card.query_selector(SEL_STARS)
        m = re.search(r"(\d)", stars_el.get_attribute("aria-label") or "") if stars_el else None
        text_el = card.query_selector(SEL_TEXT)
        date_el = card.query_selector(SEL_DATE)
        out[rid] = Review(
            review_id=rid,
            name=name,
            rating=int(m.group(1)) if m else 0,
            text=clean_text(text_el.inner_text() if text_el else ""),
            date=(date_el.inner_text().strip() if date_el else ""),
        )
    return list(out.values())


def clean_text(s: str) -> str:
    s = s.strip()
    m = re.search(r"\(Original\)\s*([\s\S]*)$", s)  # Google-translated reviews: keep original
    return (m.group(1) if m else s).strip()


def scrape(known_ids: set[str], full_scan: bool) -> list[Review]:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(locale="en-US", viewport={"width": 1280, "height": 1800})
        page = ctx.new_page()
        url = MAPS_URL + ("&hl=en" if "?" in MAPS_URL else "?hl=en")
        page.goto(url, wait_until="domcontentloaded", timeout=60_000)

        # Cookie consent (shown in some regions).
        for label in ("Accept all", "Reject all"):
            btn = page.query_selector(f"button[aria-label='{label}']")
            if btn:
                btn.click()
                page.wait_for_load_state("domcontentloaded")
                break

        # Open the Reviews tab if the URL didn't already.
        tab = page.query_selector("button[role='tab'][aria-label*='Reviews' i]")
        if tab:
            tab.click()
        page.wait_for_selector(SEL_REVIEW, timeout=30_000)

        # Sort by newest so incremental runs only need the top of the list.
        try:
            page.click("button[aria-label*='Sort' i]", timeout=5000)
            page.click("div[role='menuitemradio']:has-text('Newest')", timeout=5000)
            page.wait_for_timeout(2000)
        except Exception:
            print("warn: could not switch sort to Newest; continuing with default order")

        feed = page.query_selector("div[role='feed']") or page.query_selector(
            "div.m6QErb.DxyBCb.kA9KIf.dS8AEf"
        )
        max_scrolls = MAX_SCROLLS_FULL if full_scan else MAX_SCROLLS_INCREMENTAL
        last_count = -1
        for _ in range(max_scrolls):
            reviews = extract_reviews(page)
            if not full_scan and any(r.review_id in known_ids for r in reviews):
                break  # reached reviews we already have
            if len(reviews) == last_count:
                break  # no more loading
            last_count = len(reviews)
            if feed:
                feed.evaluate("el => el.scrollTo(0, el.scrollHeight)")
            else:
                page.mouse.wheel(0, 4000)
            page.wait_for_timeout(1800)

        reviews = extract_reviews(page)
        browser.close()
        return reviews


# ---------------------------------------------------------------- sheet upsert

def norm(s) -> str:
    return re.sub(r"\s+", " ", str(s or "")).strip().lower()


def pad(row: list, n: int = len(HEADERS)) -> list:
    return (list(row) + [""] * n)[:n]


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
            continue  # same review rendered twice in one scrape
        seen.add(rv.review_id)
        i = by_id.get(rv.review_id)
        if i is None:
            i = by_name.pop(norm(rv.name), None)
        if i is None:
            appended.append([rv.name, rv.rating or "", rv.text, "", "", rv.review_id, "", rv.date])
            continue
        row, before = rows[i], list(rows[i])
        row[C_ID] = rv.review_id
        if rv.rating:
            row[C_RATING] = rv.rating
        cur = str(row[C_REVIEW] or "")
        if rv.text and (not cur.strip() or TRUNCATED.search(cur)):
            row[C_REVIEW] = rv.text
        if not str(row[C_DATE]).strip() and rv.date:
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
    known_ids = {str(pad(r)[C_ID]).strip() for r in rows if str(pad(r)[C_ID]).strip()}
    if not known_ids:
        full_scan = True  # first run: backfill ids for the hand-typed rows

    reviews = scrape(known_ids, full_scan)
    print(f"scraped {len(reviews)} reviews (full_scan={full_scan})")
    if not reviews:
        print("error: 0 reviews scraped — Google probably changed the page. Check the selectors.")
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
