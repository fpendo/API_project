---
title: SEO + ASO Report
type: business
project: Designo
updated: 2026-07-06
---

# SEO + ASO Report

Part of [[Home]]. See [[Agent Economy Positioning]], [[Pricing & Payments]].

The Monday-morning client report — the core of the £59/month value. Renamed from "SEO report" to **"SEO + ASO report"** (2026-07-06) after realising the report only showed the legacy-search half of what Designo actually optimises.

## Two halves

### SEO (legacy search — Google)
From Google Search Console once the site is live:
- Impressions, clicks, average position (with week-on-week deltas)
- 4-week impressions sparkline
- Top search queries table
- Technical health checklist (Schema.org, mobile, SSL, GBP, Search Console)
- One plain-English "recommendation of the week"

### ASO (agent search optimisation — AI assistants)
The "Agent visibility — ASO" section, added 2026-07-06:
- **AI crawler visits** — GPTBot (ChatGPT), Google-Extended (Gemini), PerplexityBot, ClaudeBot counts for the week
- **Visitors referred by AI assistants** — ChatGPT/Perplexity referrals, noting AI referrals convert at ~2.5× search traffic
- **Shadow site health (3/3)** — llms.txt served ✓, agent.json valid ✓, JSON-LD parses ✓

## Why ASO is genuinely measurable (not marketing fluff)

- AI crawlers identify themselves by **user-agent** in the nginx access logs.
- AI-referred human visitors carry identifiable **referrers** (chat.openai.com, perplexity.ai…).
- The shadow-site files can be **health-checked** automatically.

**TODO when the first client site goes live:** a small log-parsing job to populate the ASO numbers from real nginx data. Everything needed is already captured.

## Where the sample lives

Rendered by `proposal.py` (`_seo_report_preview`) with realistic sample data, clearly labelled as a sample. Shown inside the proposal page and in the portal **Documents** tab. "SEO + ASO" naming propagated to: proposal pillars/pricing/FAQ, welcome pack, mailbox follow-up template, Stripe thank-you copy, Documents tab, and the landing page's own shadow files.
