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
        status="skipped" if has_site else "new",
        status_detail="already has a website" if has_site else None,
    )
    leads_db.add_event(lead["id"], "discovered", {"source": source})
    _job_update(job_id, imported=_jobs[job_id]["imported"] + 1)


# ---------------------------------------------------------------------------
# Apify — Google Maps scraper
# ---------------------------------------------------------------------------

APIFY_BASE = "https://api.apify.com/v2"


def apify_enabled() -> bool:
    return bool(config.APIFY_TOKEN)


def start_apify_discovery(query: str, max_places: int = 40) -> dict:
    """query e.g. 'plumbers in Shrewsbury'."""
    if not apify_enabled():
        raise RuntimeError("APIFY_TOKEN is not configured")
    return _start_job("apify", query, _run_apify, query, max_places)


def _run_apify(job_id: str, query: str, max_places: int) -> None:
    try:
        actor = config.APIFY_GMAPS_ACTOR
        run_input = {
            "searchStringsArray": [query],
            "maxCrawledPlacesPerSearch": max_places,
            "language": "en",
            "scrapeContacts": True,          # enrich emails/socials from linked pages
            "skipClosedPlaces": True,
            "website": "withoutWebsite",     # only businesses with no website
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

            # Poll (scrapes typically take 1-5 minutes)
            deadline = time.time() + 15 * 60
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
            _store_lead(job_id, "apify", {
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
                "raw": {k: v for k, v in item.items()
                        if k in ("title", "categoryName", "categories", "description",
                                 "address", "phone", "totalScore", "reviewsCount",
                                 "openingHours", "reviewsTags", "url")},
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
