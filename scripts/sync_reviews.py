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

# Tried in order until the business panel loads. Don't hand-edit the `data=` part of a Maps
# URL: its `!4m8!3m7` counters must match the fields that follow, or Google drops the place.
PLACE_NAME = "Geeth Mehandi Arts"
MAPS_URLS = [
    u
    for u in [
        os.environ.get("MAPS_URL"),
        # Share link from the Maps "Share" button; redirects to the current place URL.
        "https://maps.app.goo.gl/6N7saYVfy3Y5ypYK9",
        # Exact URL copied from the browser (reviews view).
        "https://www.google.com/maps/place/Geeth+Mehandi+Arts/@12.9539648,77.4926682,17z/"
        "data=!3m1!5s0x3bae3e98f7e91a63:0x457424557f41f3e4!4m8!3m7!1s0x3bae3fa13894700b:"
        "0x860ea362dc78b97a!8m2!3d12.9539596!4d77.4952431!9m1!1b1!16s%2Fg%2F11lv53hfkj",
        # Stable fallback: the listing's CID (decimal of 0x860ea362dc78b97a).
        "https://www.google.com/maps?cid=9659837895757314426",
    ]
    if u
]
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


def dump_debug(page) -> None:
    """Save what the browser actually saw, so failures can be diagnosed from the run's artifacts."""
    os.makedirs("debug", exist_ok=True)
    try:
        print("debug: page title =", repr(page.title()))
        print("debug: page url   =", page.url)
        tabs = page.eval_on_selector_all(
            "button[role='tab']", "els => els.map(e => e.getAttribute('aria-label') || e.innerText)"
        )
        print("debug: tabs       =", tabs)
        body = page.inner_text("body")[:1500].replace("\n", " | ")
        print("debug: body text  =", body)
        page.screenshot(path="debug/page.png", full_page=True)
        with open("debug/page.html", "w", encoding="utf-8") as f:
            f.write(page.content())
        print("debug: saved debug/page.png and debug/page.html (see the run's Artifacts)")
    except Exception as e:  # never let debugging hide the real error
        print("debug: failed to capture page:", e)


def scrape(known_ids: set[str], full_scan: bool) -> list[Review]:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True, args=["--disable-blink-features=AutomationControlled"]
        )
        # Headless Chromium's default user agent says "HeadlessChrome", which Google
        # serves a degraded page to. Present as a normal desktop Chrome instead.
        ctx = browser.new_context(
            locale="en-US",
            timezone_id="Asia/Kolkata",
            viewport={"width": 1280, "height": 1800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
            ),
            extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
        )
        page = ctx.new_page()
        place_header = page.locator("h1", has_text=re.compile(re.escape(PLACE_NAME), re.I))
        for url in MAPS_URLS:
            if "google.com" in url:  # leave short share links untouched; they redirect
                url += ("&" if "?" in url else "?") + "hl=en"
            print("info: opening", url)
            page.goto(url, wait_until="domcontentloaded", timeout=60_000)
            # Cookie consent (shown in some regions; also a full-page "Before you continue").
            for label in ("Accept all", "Reject all"):
                btn = page.query_selector(f"button[aria-label='{label}']") or page.query_selector(
                    f"button:has-text('{label}')"
                )
                if btn:
                    btn.click()
                    page.wait_for_load_state("domcontentloaded")
                    break
            try:
                place_header.first.wait_for(timeout=20_000)
                print("info: business panel loaded")
                break
            except Exception:
                print("warn: business panel did not load from this URL; landed on", page.url)
        else:
            dump_debug(page)
            raise RuntimeError(f"Could not open the '{PLACE_NAME}' listing from any URL")

        try:
            # Open the Reviews tab if the URL didn't already.
            tab = page.get_by_role("tab", name=re.compile(r"Reviews", re.I))
            if tab.count():
                tab.first.click()
            page.wait_for_selector(SEL_REVIEW, timeout=30_000)
        except Exception:
            dump_debug(page)
            raise

        # Sort by newest so incremental runs only need the top of the list.
        try:
            page.click("button[aria-label*='Sort' i]", timeout=5000)
            page.click("div[role='menuitemradio']:has-text('Newest')", timeout=5000)
            page.wait_for_timeout(2000)
        except Exception:
            print("warn: could not switch sort to Newest; continuing with default order")

        max_scrolls = MAX_SCROLLS_FULL if full_scan else MAX_SCROLLS_INCREMENTAL
        last_count, stalls = -1, 0
        for n in range(max_scrolls):
            count = page.locator(SEL_REVIEW).count()
            if not full_scan and any(
                (page.locator(SEL_REVIEW).nth(i).get_attribute("data-review-id") or "") in known_ids
                for i in range(count)
            ):
                break  # reached reviews we already have
            if count == last_count:
                stalls += 1
                if stalls >= 4:  # nothing new after several tries: end of list
                    break
            else:
                stalls = 0
            last_count = count
            print(f"info: scroll {n + 1}: {count} review cards loaded")
            # Scroll the last card into view; that triggers loading the next batch no
            # matter what the scrollable panel is called.
            last = page.locator(SEL_REVIEW).last
            try:
                last.scroll_into_view_if_needed(timeout=5000)
                last.hover(timeout=2000)
                page.mouse.wheel(0, 3000)  # wheel over the panel (mouse is now on it)
            except Exception:
                pass
            page.wait_for_timeout(2500 if stalls else 1800)

        reviews = extract_reviews(page)
        os.makedirs("debug", exist_ok=True)
        page.screenshot(path="debug/after-scroll.png")
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
