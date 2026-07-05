"""Machine-readable "shadow site" for agentic commerce.

Every generated site ships a parallel layer that AI agents can consume
without parsing the visual page:

    site/llms.txt     llmstxt.org-convention markdown summary
    site/agent.json   structured business + services + transaction actions
    site/agent.html   semantic, microdata-marked HTML rendering of the same

plus schema.org JSON-LD and <link rel="alternate"> tags injected into the
generated index.html <head> (which doubles as SEO structured data).

The Claude-produced data is cached per project in shadow.json (like
concept.json) so iterations don't re-spend tokens; a fresh generate re-runs it.
"""
import html as html_mod
import json
import logging

from . import skill, storage

log = logging.getLogger("designo.shadow")


def _shadow_path(project_id: str):
    return storage.project_dir(project_id) / "shadow.json"


def load(project_id: str) -> dict | None:
    path = _shadow_path(project_id)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def ensure(project_id: str, brief: dict, concept: dict | None,
           force: bool = False) -> dict:
    """Return shadow data, generating (and caching) it if needed."""
    if not force:
        cached = load(project_id)
        if cached:
            return cached
    from . import generator  # late import to avoid a cycle

    data = generator.call_claude_json(
        [{"role": "user", "content": skill.build_shadow_prompt(brief, concept)}],
        system=skill.SHADOW_SITE_SKILL,
        max_tokens=4000,
    )
    if not isinstance(data.get("agent"), dict):
        raise ValueError("shadow generator returned no agent object")
    _shadow_path(project_id).write_text(json.dumps(data, indent=2), encoding="utf-8")
    log.info("project %s: shadow site data generated", project_id)
    return data


def write_files(project_id: str, data: dict) -> None:
    """Write llms.txt / agent.json / agent.html into site/. Call after write_site."""
    site = storage.site_dir(project_id)
    site.mkdir(parents=True, exist_ok=True)
    agent = data.get("agent") or {}
    (site / "llms.txt").write_text(
        (data.get("llms_txt") or "").strip() + "\n", encoding="utf-8")
    (site / "agent.json").write_text(
        json.dumps(agent, indent=2, ensure_ascii=False), encoding="utf-8")
    (site / "agent.html").write_text(_render_agent_html(agent, data.get("jsonld")),
                                     encoding="utf-8")


def inject(site_html: str, data: dict) -> str:
    """Insert JSON-LD + alternate links into the generated page's <head>."""
    jsonld = data.get("jsonld")
    parts = ['\n<link rel="alternate" type="application/json" href="agent.json" '
             'title="Machine-readable business data">'
             '\n<link rel="alternate" type="text/plain" href="llms.txt" title="llms.txt">']
    if jsonld:
        parts.append(
            '\n<script type="application/ld+json">'
            + json.dumps(jsonld, ensure_ascii=False)
            + "</script>"
        )
    snippet = "".join(parts) + "\n"
    idx = site_html.find("</head>")
    if idx == -1:
        return site_html
    return site_html[:idx] + snippet + site_html[idx:]


def _render_agent_html(agent: dict, jsonld: dict | None) -> str:
    """Deterministic, semantic, unstyled-first page for browsing agents."""
    esc = html_mod.escape
    name = esc(agent.get("name", "Business"))
    loc = agent.get("location") or {}
    contact = agent.get("contact") or {}

    services_html = ""
    for s in agent.get("services") or []:
        actions = "".join(
            f'<li data-action-type="{esc(str(a.get("type", "")))}" '
            f'data-channel="{esc(str(a.get("channel", "")))}">'
            f'{esc(str(a.get("type", "")).replace("_", " "))}: '
            f'{esc(str(a.get("target", "")))}</li>'
            for a in s.get("actions") or []
        )
        services_html += f"""
    <article itemscope itemtype="https://schema.org/Offer" id="{esc(str(s.get('id', '')))}">
      <h3 itemprop="name">{esc(str(s.get('name', '')))}</h3>
      <p itemprop="description">{esc(str(s.get('description', '')))}</p>
      <p>Price: <span itemprop="price">{esc(str(s.get('price', 'on request')))}</span></p>
      <ul class="actions">{actions}</ul>
    </article>"""

    jsonld_tag = (
        '<script type="application/ld+json">' + json.dumps(jsonld, ensure_ascii=False) + "</script>"
        if jsonld else ""
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{name} — machine-readable</title>
<meta name="description" content="{esc(str(agent.get('description', '')))}">
<link rel="alternate" type="application/json" href="agent.json">
<link rel="alternate" type="text/plain" href="llms.txt">
{jsonld_tag}
<style>body{{font-family:system-ui,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem;line-height:1.6}}</style>
</head>
<body itemscope itemtype="https://schema.org/LocalBusiness">
  <p><small>Machine-readable page. Human version: <a href="index.html">index.html</a>.
     Structured data: <a href="agent.json">agent.json</a> · <a href="llms.txt">llms.txt</a></small></p>
  <h1 itemprop="name">{name}</h1>
  <p itemprop="description">{esc(str(agent.get('description', '')))}</p>
  <dl>
    <dt>Category</dt><dd>{esc(str(agent.get('category', '')))}</dd>
    <dt>Service area</dt><dd itemprop="areaServed">{esc(str(agent.get('service_area', '')))}</dd>
    <dt>Address</dt><dd itemprop="address">{esc(', '.join(str(v) for v in
        [loc.get('address'), loc.get('town'), loc.get('postcode')] if v))}</dd>
    <dt>Phone</dt><dd itemprop="telephone">{esc(str(contact.get('phone', '')))}</dd>
    <dt>Email</dt><dd itemprop="email">{esc(str(contact.get('email', '')))}</dd>
  </dl>
  <section>
    <h2>Services</h2>{services_html}
  </section>
  <section>
    <h2>How to transact</h2>
    <p>{esc(str(agent.get('transaction_notes', '')))}</p>
  </section>
</body>
</html>"""
