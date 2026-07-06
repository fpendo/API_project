---
title: Bot Strategy — Good Bots vs Bad
type: business
project: Designo
updated: 2026-07-06
---

# Bot Strategy — Good Bots vs Bad

Part of [[Home]]. Related: [[SEO + ASO Report]], [[Agent Economy Positioning]], [[Website Audit Methodology]].

The ASO proposition — being recommended by AI assistants — requires *some* bots to be welcomed. The threat model requires *others* to be blocked. Telling them apart is the foundation of both a credible weekly report and a secure hosting product.

## How an AI assistant finds a local business

When someone asks ChatGPT "who's a good roofer in Dorchester?", the answer comes from three places:

1. **Live web search** — ChatGPT, Perplexity, Google AI Mode all run a real search (Bing index, Google index, own crawlers) and compose an answer from the top results. This is where most local-business recommendations come from today.
2. **Training data** — what the model memorised during training, months ago. A small local business is unlikely to be in it; cannot be relied upon.
3. **Maps/listings data** — assistants often pull Google Business Profile data (reviews, hours, category) for hyper-local queries.

Practical implication: **you cannot be cited if you cannot be indexed.** Crawlable pages, a sitemap, Search Console verification and a Google Business Profile remain the non-optional foundation. JSON-LD and the shadow layer then make the indexed content *legible* to answer engines.

## What each shadow-site file actually does

| File | Who uses it | When it helps |
|---|---|---|
| **JSON-LD (schema.org)** | Google, Bing, all answer engines | Now — widely consumed, a real signal for citations |
| **Static crawlable HTML** | Every crawler | Now — most AI crawlers don't run JavaScript; single-file static HTML means every word is visible |
| **llms.txt** | Some language model crawlers | Emerging — adoption patchy but costs nothing |
| **agent.json / agent.html** | Action-capable assistants | Future — enables quote requests, calls; nothing mainstream consumes it yet |

The honest framing: JSON-LD + crawlable HTML help **today**. llms.txt + agent.json position for **what's coming**.

## The risks

1. **Impersonation (the big one).** Any script can set its User-Agent to "GPTBot". If the weekly ASO report counts crawler visits naïvely from User-Agent alone, spoofed bots inflate the numbers and the report is fiction. Malicious scrapers also impersonate Googlebot because everyone allowlists it.
2. **Resource abuse.** Training crawlers (Bytespider, CCBot, Amazonbot, hundreds of no-name bots) hammer small sites for bandwidth with zero customer benefit. They're far more aggressive than search crawlers.
3. **Site cloning.** Static single-file sites are trivially copied wholesale — used for phishing duplicates that intercept client enquiries.
4. **Credential attacks.** Login pages (portal, prospect previews) are targets for password stuffing. Prospect passwords are intentionally simple (word-word-NN); rate limiting matters more than password complexity there.
5. **Form/email harvesting.** Client sites expose phone/email — harvesters feed these to spam lists.
6. **Vulnerability scanners.** Constant background noise probing WordPress paths, common CVEs etc. Not a real threat to our stack but clogs logs.

## How to tell good bots from bad — the key fact

**Legitimate crawlers are verifiable. Imposters are not.**

Every bot worth allowing publishes a way to prove its identity:

- **Google/Bing:** reverse-DNS lookup — the IP resolves back to `*.googlebot.com` or `*.search.msn.com`. Automate this check.
- **OpenAI (GPTBot, OAI-SearchBot):** [published IP ranges](https://openai.com/gptbot-ranges.txt)
- **Anthropic (ClaudeBot):** published via their site
- **Perplexity (PerplexityBot):** published via their site
- **Google-Extended (Gemini training):** verifiable as Googlebot variants

Rule: **trust the User-Agent only when the IP checks out.** Anything claiming to be GPTBot from a random VPS is malicious — block it and log it. Real GPTBot from a confirmed OpenAI range — welcome it.

## The tier plan

### Tier 1 — Verified-bot counting (protects the report)
When the weekly ASO report tallies AI crawler visits, verify claimed bots against published IP ranges before counting them. Only verified bots count toward "AI crawler visits". Bonus metric: "we also blocked N imposters this week" — a compelling line in a client report that no competitor can offer.

**Implementation:** a log-parsing job that cross-references access logs against regularly refreshed IP lists. A Python script, run weekly alongside the report generation.

### Tier 2 — nginx hygiene (protects the server)
- Rate-limit login endpoints (`/designo/login`, `/p/*/`) and the API
- Return 429 after N failed logins per IP per minute
- Block known-bad UA strings (scrapers that don't bother spoofing)
- Fail2ban for repeat offenders

Cheap, no third party, no customer impact.

### Tier 3 — robots.txt policy (invites the right bots)

Current gap: **Designo-hosted client sites ship no `robots.txt` and no `sitemap.xml`**. Both should be generated at go-live.

```text
User-agent: *
Allow: /

# Explicitly welcome answer-engine bots (they look before fetching)
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

# Training-only crawlers — judgement call (commented out to allow by default)
# User-agent: Bytespider
# Disallow: /

Sitemap: https://client-domain.co.uk/sitemap.xml
```

Prospect previews already ship `<meta name="robots" content="noindex">` — correct, keep that.

### What to avoid
Do NOT put client sites behind aggressive challenge walls (Cloudflare Bot Fight Mode, CAPTCHA challenges). We've seen from the scraping side how challenge pages block legitimate automated visitors — and an AI assistant that hits a challenge wall simply cannot read or recommend the business. That would undo the entire ASO proposition. If Cloudflare is ever used, verified AI crawlers must be explicitly allowlisted in the WAF.

## The client narrative

> "Same principle as the front door of your shop. The postman shows ID — they come in. The person with a fake badge gets turned away, and we show you the tally every Monday."

The weekly report already shows AI crawler visits and AI-referred conversions. Adding the "verified vs imposters blocked" line turns bot protection from a cost into a visible value-add that no local web agency currently offers.

## TODOs

- [ ] Generate `robots.txt` + `sitemap.xml` as part of the go-live shadow layer (add to `shadow.py`)
- [ ] Implement verified-bot IP checking in the weekly log-parsing job (Tier 1)
- [ ] Add nginx rate-limiting to login endpoints (Tier 2)
- [ ] Add the "imposters blocked" count to the ASO section of the weekly report
