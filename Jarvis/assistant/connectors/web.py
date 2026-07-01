"""Web access: search the web (DuckDuckGo, no API key) and fetch page text."""

from __future__ import annotations

import httpx
from bs4 import BeautifulSoup
from ddgs import DDGS

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
}

# Cap fetched page text so a single page can't blow the LLM context/cost.
_MAX_PAGE_CHARS = 6000


def web_search(query: str, max_results: int = 5) -> list[dict]:
    """Search the web and return a list of {title, url, snippet}."""
    out: list[dict] = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=max(1, min(max_results, 10))):
            out.append(
                {
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                }
            )
    return out


def fetch_url(url: str) -> dict:
    """Fetch a URL and return {url, title, text} with readable text extracted.

    Returns {url, error} on failure so the agent can try another source.
    """
    try:
        with httpx.Client(
            headers=_HEADERS, follow_redirects=True, timeout=20.0
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "html" not in content_type and "text" not in content_type:
                return {
                    "url": str(resp.url),
                    "title": "",
                    "text": f"[Unsupported content type: {content_type}]",
                }
            html = resp.text
    except httpx.HTTPError as exc:
        return {
            "url": url,
            "error": f"Could not fetch this page ({exc}). Try another source.",
        }

    soup = BeautifulSoup(html, "html.parser")

    # Strip non-content elements.
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside"]):
        tag.decompose()

    title = (soup.title.string.strip() if soup.title and soup.title.string else "")
    text = " ".join(soup.get_text(separator=" ").split())
    if len(text) > _MAX_PAGE_CHARS:
        text = text[:_MAX_PAGE_CHARS] + " ...[truncated]"

    return {"url": url, "title": title, "text": text}
