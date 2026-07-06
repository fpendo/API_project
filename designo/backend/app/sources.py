"""Lead discovery sources.

All sources normalise into the same lead shape and dedupe on
(business_name, postcode). Businesses that already have a website are
recorded but marked 'skipped' so spend isn't wasted mocking them up.

- ApifySource: Google Maps scraper actor (paid, ~$4-7/1000 places). Finds
  businesses per "category + town" query; `website` empty => lead. Contact
  enrichment pulls emails from linked social/company pages where available.
- CompaniesHouseSource: free UK registry. Newly incorporated companies are
  warm leads (they need a site and rarely have one). No emails — flagged
  'needs email' for manual enrichment.
- CSV import: manual fallback, columns matched loosely by header name.
"""
import csv
import io
import logging
import re
import threading
import time
import uuid
from datetime import date, timedelta

import httpx

from . import config, leads_db

log = logging.getLogger("designo.sources")

# In-memory discovery job registry (single-process app; jobs are best-effort).
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _job_update(job_id: str, **fields) -> None:
    with _jobs_lock:
        if job_id in _jobs:
            _jobs[job_id].update(fields)


def get_job(job_id: str) -> dict | None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def _create_job(kind: str, label: str) -> dict:
    job_id = uuid.uuid4().hex
    job = {
        "id": job_id, "kind": kind, "label": label, "status": "running",
        "found": 0, "imported": 0, "skipped": 0, "error": None,
        "started_at": time.time(),
    }
    with _jobs_lock:
        _jobs[job_id] = job
    return dict(job)


def _start_job(kind: str, label: str, target, *args) -> dict:
    job = _create_job(kind, label)
    threading.Thread(target=target, args=(job["id"], *args), daemon=True).start()
    return job


def _store_lead(job_id: str, source: str, record: dict) -> None:
    """Dedupe + insert one normalised lead record."""
    name = (record.get("business_name") or "").strip()
    if not name:
        return
    postcode = (record.get("postcode") or "").strip()
    if leads_db.lead_exists(name, postcode):
        _job_update(job_id, skipped=_jobs[job_id]["skipped"] + 1)
        return
    has_site = bool((record.get("website") or "").strip())
    status = record.get("status") or ("skipped" if has_site else "new")
    status_detail = record.get("status_detail") or (
        "already has a website" if has_site else None)
    lead = leads_db.create_lead(
        source=source,
        business_name=name,
        category=(record.get("category") or "").strip(),
        description=(record.get("description") or "").strip(),
        address=(record.get("address") or "").strip(),
        postcode=postcode,
        town=(record.get("town") or "").strip(),
        phone=(record.get("phone") or "").strip(),
        email=(record.get("email") or "").strip().lower(),
        website=(record.get("website") or "").strip(),
        socials=record.get("socials") or {},
        raw=record.get("raw") or {},
        rating=record.get("rating"),
        reviews_count=record.get("reviews_count"),
        status=status,
        status_detail=status_detail,
    )
    leads_db.add_event(lead["id"], "discovered", {"source": source})
    _job_update(job_id, imported=_jobs[job_id]["imported"] + 1)


# ---------------------------------------------------------------------------
# Apify — Google Maps scraper
# ---------------------------------------------------------------------------

APIFY_BASE = "https://api.apify.com/v2"


def apify_enabled() -> bool:
    return bool(config.APIFY_TOKEN)


def start_apify_discovery(query: str, max_places: int = 40,
                          mode: str = "no_website") -> dict:
    """query e.g. 'plumbers in Shrewsbury'.

    mode:
      - "no_website": businesses with no website at all (default)
      - "old_website": businesses whose website looks dated — each candidate
        site is audited (technical heuristics + creative-director visual
        review); only sites judged dated are imported as leads.
    """
    if not apify_enabled():
        raise RuntimeError("APIFY_TOKEN is not configured")
    label = query if mode == "no_website" else f"{query} (dated websites)"
    return _start_job("apify", label, _run_apify, query, max_places, mode)


# --- Region sweep ------------------------------------------------------------
#
# Curated town list for the South West sweep. Deliberately market towns and
# cities where service businesses cluster; category x town becomes one Apify
# search string each.

SOUTH_WEST_TOWNS = [
    # Cornwall
    "Truro", "Falmouth", "Penzance", "St Austell", "Newquay", "Bodmin",
    # Devon
    "Exeter", "Plymouth", "Torquay", "Barnstaple", "Exmouth", "Newton Abbot",
    # Somerset
    "Taunton", "Yeovil", "Bridgwater", "Weston-super-Mare", "Frome",
    # Dorset
    "Bournemouth", "Poole", "Dorchester", "Weymouth",
    # Bristol / Bath / Wiltshire / Gloucestershire
    "Bristol", "Bath", "Swindon", "Salisbury", "Gloucester", "Cheltenham",
]

# Google Maps categories that indicate product/retail businesses — excluded
# when a sweep asks for services only (product sites need e-commerce, which
# we don't want to take on).
_PRODUCT_CATEGORY_WORDS = (
    "shop", "store", "retail", "supermarket", "boutique", "dealer",
    "dealership", "showroom", "wholesaler", "supplier", "market",
    "bakery", "butcher", "florist", "garden centre", "furniture",
)


def _looks_like_product_business(item: dict) -> str | None:
    """Return the offending category if this looks like a product seller."""
    cats = [item.get("categoryName") or ""] + list(item.get("categories") or [])
    for cat in cats:
        c = cat.lower()
        if any(w in c for w in _PRODUCT_CATEGORY_WORDS):
            return cat
    return None


def start_region_sweep(categories: list[str], max_per_search: int = 10,
                       towns: list[str] | None = None) -> dict:
    """Sweep service categories across South West towns, auditing each
    business website for modernisation ammo. Services only — product
    businesses are filtered out by category and by e-commerce signals."""
    if not apify_enabled():
        raise RuntimeError("APIFY_TOKEN is not configured")
    towns = towns or SOUTH_WEST_TOWNS
    queries = [f"{cat.strip()} in {town}" for cat in categories if cat.strip()
               for town in towns]
    if not queries:
        raise RuntimeError("at least one category is required")
    if len(queries) > 60:
        raise RuntimeError(
            f"{len(queries)} searches is too many for one sweep — "
            "use fewer categories (limit 60 searches)")
    label = f"SW sweep: {', '.join(categories)} ({len(queries)} searches)"
    return _start_job("apify", label, _run_apify, queries, max_per_search,
                      "old_website", True)


# --- "Old generation" website heuristics -----------------------------------
#
# Technical pre-filter only: a site can fail every technical check and still
# look fine to a customer (TWR Lighting), or pass a few and look like 2005
# (SBR Electrical). The qualifying judgement is the creative-director visual
# review in visual_audit.py; these heuristics decide who is worth the cost of
# that review, and their findings remain true pitch ammunition.

_DATED_THRESHOLD = 4

def _audit_website(url: str) -> dict | None:
    """Fetch a site and score how dated it looks. None if unreachable."""
    if not url.startswith(("http://", "https://")):
        url = "http://" + url
    try:
        with httpx.Client(timeout=12, follow_redirects=True,
                          headers={"User-Agent": "Mozilla/5.0 (compatible; DesignoAudit/1.0)"},
                          verify=False) as client:
            resp = client.get(url)
            final_url = str(resp.url)
            html = resp.text[:400_000]
    except Exception as exc:
        return {"reachable": False, "error": str(exc)[:200], "score": 0, "signals": []}

    low = html.lower()

    # A bot-challenge page (SiteGround sgcaptcha, Cloudflare…) is not the real
    # site — scoring it produces garbage signals (no viewport, no schema…).
    # Flag it so the caller relies on the visual review, which can wait the
    # challenge out in a real browser.
    if any(m in low[:6_000] for m in (
            "sgcaptcha", "checking the site connection security",
            "checking your browser", "just a moment",
            "verify you are human", "cf-browser-verification")):
        return {"reachable": True, "score": 0, "signals": [],
                "final_url": final_url, "ecommerce": False,
                "challenge": True}

    score = 0
    signals: list[str] = []

    def hit(points: int, label: str) -> None:
        nonlocal score
        score += points
        signals.append(label)

    if "<meta" not in low or "viewport" not in low:
        hit(4, "no mobile viewport (pre-responsive era)")
    if final_url.startswith("http://"):
        hit(3, "no HTTPS")
    for tag, label in (("<frameset", "framesets"), ("<marquee", "<marquee> tag"),
                       ("<font ", "<font> tags"), ("<center>", "<center> tags")):
        if tag in low:
            hit(3, label)
            break
    if ".swf" in low or "shockwave-flash" in low:
        hit(3, "Flash content")
    m = re.search(r'name=["\']generator["\'][^>]*content=["\']([^"\']+)', low)
    if m and any(g in m.group(1) for g in ("frontpage", "dreamweaver", "microsoft word",
                                           "godaddy", "homestead", "yola", "webplus")):
        hit(3, f"built with {m.group(1).strip()[:40]}")
    years = [int(y) for y in re.findall(
        r"(?:&copy;|©|copyright)\D{0,30}?(20[0-2]\d|19\d\d)", low)]
    if years:
        stale = date.today().year - max(years)
        if stale >= 8:
            hit(4, f"copyright stuck at {max(years)}")
        elif stale >= 5:
            hit(3, f"copyright stuck at {max(years)}")
        elif stale >= 3:
            hit(2, f"copyright stuck at {max(years)}")
    if re.search(r"jquery[.-]1\.\d", low):
        hit(2, "jQuery 1.x (2006-2016)")
    if "bgcolor=" in low or "cellpadding=" in low:
        hit(2, "table-era markup (bgcolor/cellpadding)")
    if "application/ld+json" not in low and "schema.org" not in low:
        hit(1, "no structured data")

    ecommerce = any(marker in low for marker in (
        "add to cart", "add to basket", "woocommerce", "shopify",
        "add-to-cart", "cdn.shopify.com", "bigcommerce", "opencart"))

    return {"reachable": True, "score": score, "signals": signals,
            "final_url": final_url, "ecommerce": ecommerce}


def _run_apify(job_id: str, query: str | list[str], max_places: int,
               mode: str = "no_website", services_only: bool = False) -> None:
    try:
        actor = config.APIFY_GMAPS_ACTOR
        queries = [query] if isinstance(query, str) else query
        run_input = {
            "searchStringsArray": queries,
            "maxCrawledPlacesPerSearch": max_places,
            "language": "en",
            "countryCode": "gb",             # UK businesses only
            "scrapeContacts": True,          # enrich emails/socials from linked pages
            "skipClosedPlaces": True,
            "website": ("withWebsite" if mode == "old_website"
                        else "withoutWebsite"),
        }
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                f"{APIFY_BASE}/acts/{actor}/runs",
                params={"token": config.APIFY_TOKEN},
                json=run_input,
            )
            resp.raise_for_status()
            run = resp.json()["data"]
            run_id = run["id"]

            # Poll (single searches take 1-5 min; sweeps scale with searches)
            deadline = time.time() + min(60, 15 + len(queries)) * 60
            status = run["status"]
            while status in ("READY", "RUNNING") and time.time() < deadline:
                time.sleep(10)
                resp = client.get(f"{APIFY_BASE}/actor-runs/{run_id}",
                                  params={"token": config.APIFY_TOKEN})
                resp.raise_for_status()
                run = resp.json()["data"]
                status = run["status"]
            if status != "SUCCEEDED":
                raise RuntimeError(f"Apify run ended with status {status}")

            resp = client.get(
                f"{APIFY_BASE}/datasets/{run['defaultDatasetId']}/items",
                params={"token": config.APIFY_TOKEN, "format": "json", "clean": "true"},
            )
            resp.raise_for_status()
            items = resp.json()

        _job_update(job_id, found=len(items))
        for item in items:
            emails = item.get("emails") or []
            socials = {
                k: item.get(k) for k in
                ("facebooks", "instagrams", "linkedIns", "twitters")
                if item.get(k)
            }
            if services_only:
                product_cat = _looks_like_product_business(item)
                if product_cat:
                    log.info("sweep: skipping product business %r (%s)",
                             item.get("title"), product_cat)
                    continue
            status = status_detail = None
            audit = None
            if mode == "old_website":
                website = (item.get("website") or "").strip()
                if not website:
                    continue
                audit = _audit_website(website)
                if services_only and audit.get("ecommerce"):
                    log.info("sweep: skipping e-commerce site %r",
                             item.get("title"))
                    continue
                if not audit.get("reachable"):
                    # A dead site is the best modernisation lead of all
                    status, status_detail = "new", "website unreachable — likely abandoned"
                elif audit["score"] >= _DATED_THRESHOLD or audit.get("challenge"):
                    # Challenge-walled sites can't be scored from HTML — let
                    # the visual review (real browser, waits the wall out)
                    # make the call.
                    # Technical age is only the pre-filter; the qualifying
                    # judgement is visual.
                    from . import visual_audit
                    visual = visual_audit.review(website)
                    if visual:
                        audit["visual"] = visual
                        audit["bread_and_butter"] = visual["verdict"] in ("rebuild", "dead")
                        if visual["verdict"] == "modern":
                            log.info("sweep: %r technically dated but looks "
                                     "modern (design %s/10) — skipping",
                                     item.get("title"), visual["design_score"])
                            continue
                        status = "new"
                        if visual["verdict"] == "dead":
                            status_detail = "website dead/parked — likely abandoned"
                        else:
                            tier = ("REBUILD" if visual["verdict"] == "rebuild"
                                    else "borderline")
                            first_reason = (visual["reasons"][0]
                                            if visual.get("reasons") else "")
                            status_detail = (
                                f"{tier} — design {visual['design_score']}/10, "
                                f"reads as {visual['era']}. {first_reason}")
                    elif audit.get("challenge"):
                        continue  # couldn't see past the bot wall — not a lead
                    else:
                        # Screenshot/vision unavailable — fall back to the
                        # technical score alone.
                        status = "new"
                        status_detail = ("dated website (score {}): {}".format(
                            audit["score"], "; ".join(audit["signals"][:4])))
                else:
                    continue  # technically modern enough — not a lead
            _store_lead(job_id, "apify", {
                "status": status,
                "status_detail": status_detail,
                "business_name": item.get("title"),
                "category": item.get("categoryName") or "",
                "description": item.get("description") or "",
                "address": item.get("address") or "",
                "postcode": item.get("postalCode") or "",
                "town": item.get("city") or "",
                "phone": item.get("phone") or "",
                "email": (emails[0] if emails else ""),
                "website": item.get("website") or "",
                "socials": socials,
                "rating": item.get("totalScore"),
                "reviews_count": item.get("reviewsCount"),
                "raw": {
                    **{k: v for k, v in item.items()
                       if k in ("title", "categoryName", "categories", "description",
                                "address", "phone", "totalScore", "reviewsCount",
                                "openingHours", "reviewsTags", "url")},
                    **({"site_audit": audit} if audit else {}),
                },
            })
        _job_update(job_id, status="done")
    except Exception as exc:
        log.exception("apify discovery failed")
        _job_update(job_id, status="error", error=str(exc))


# ---------------------------------------------------------------------------
# Companies House — newly incorporated UK companies
# ---------------------------------------------------------------------------

CH_BASE = "https://api.company-information.service.gov.uk"


def companies_house_enabled() -> bool:
    return bool(config.COMPANIES_HOUSE_KEY)


def start_companies_house_discovery(sic_code: str, days_back: int = 30,
                                    max_companies: int = 50) -> dict:
    if not companies_house_enabled():
        raise RuntimeError("COMPANIES_HOUSE_KEY is not configured")
    label = f"SIC {sic_code}, last {days_back} days"
    return _start_job("companies_house", label, _run_companies_house,
                      sic_code, days_back, max_companies)


def _run_companies_house(job_id: str, sic_code: str, days_back: int,
                         max_companies: int) -> None:
    try:
        since = (date.today() - timedelta(days=days_back)).isoformat()
        with httpx.Client(timeout=60, auth=(config.COMPANIES_HOUSE_KEY, "")) as client:
            resp = client.get(
                f"{CH_BASE}/advanced-search/companies",
                params={
                    "sic_codes": sic_code,
                    "incorporated_from": since,
                    "company_status": "active",
                    "size": min(max_companies, 500),
                },
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])

        _job_update(job_id, found=len(items))
        for item in items:
            addr = item.get("registered_office_address") or {}
            address = ", ".join(filter(None, [
                addr.get("address_line_1"), addr.get("address_line_2"),
                addr.get("locality"), addr.get("region"),
            ]))
            _store_lead(job_id, "companies_house", {
                "business_name": item.get("company_name"),
                "category": ", ".join(item.get("sic_codes") or []),
                "description": f"Incorporated {item.get('date_of_creation', '?')} "
                               f"(company no. {item.get('company_number', '?')})",
                "address": address,
                "postcode": addr.get("postal_code") or "",
                "town": addr.get("locality") or "",
                "raw": {"company_number": item.get("company_number"),
                        "date_of_creation": item.get("date_of_creation"),
                        "sic_codes": item.get("sic_codes")},
            })
        _job_update(job_id, status="done")
    except Exception as exc:
        log.exception("companies house discovery failed")
        _job_update(job_id, status="error", error=str(exc))


# ---------------------------------------------------------------------------
# CSV import
# ---------------------------------------------------------------------------

CSV_ALIASES = {
    "business_name": ("business_name", "name", "business", "company", "company_name", "title"),
    "category": ("category", "type", "industry", "trade"),
    "description": ("description", "about", "notes"),
    "address": ("address", "street", "location"),
    "postcode": ("postcode", "postal_code", "zip", "post_code"),
    "town": ("town", "city", "locality"),
    "phone": ("phone", "telephone", "tel", "mobile"),
    "email": ("email", "e-mail", "email_address", "mail"),
    "website": ("website", "url", "site", "web"),
}


def import_csv(data: bytes) -> dict:
    """Synchronous CSV import; returns a completed job record."""
    text = data.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("CSV has no header row")

    header_map: dict[str, str] = {}
    lowered = {h.strip().lower(): h for h in reader.fieldnames}
    for field, aliases in CSV_ALIASES.items():
        for alias in aliases:
            if alias in lowered:
                header_map[field] = lowered[alias]
                break
    if "business_name" not in header_map:
        raise ValueError(
            "CSV needs a business name column (e.g. 'name' or 'business_name'); "
            f"found headers: {', '.join(reader.fieldnames)}"
        )

    job = _create_job("csv", "CSV import")
    job_id = job["id"]
    found = 0
    for row in reader:
        found += 1
        record = {field: (row.get(src) or "").strip() for field, src in header_map.items()}
        _store_lead(job_id, "csv", record)
    _job_update(job_id, status="done", found=found)
    return get_job(job_id)
