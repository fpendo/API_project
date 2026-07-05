"""Proposal page and SEO report preview — served to interested prospects.

Routes (added to prospect.py):
  GET  /p/{slug}/proposal/          — full proposal with pricing + Stripe CTAs
  POST /p/{slug}/pay                — redirect to Stripe one-off checkout
  POST /p/{slug}/subscribe          — redirect to Stripe subscription checkout
  GET  /p/{slug}/thank-you          — confirmation page after payment

All pages require the prospect session cookie (same as the main site login).

The SEO report preview uses realistic sample data (clearly labelled as such).
Real Google Search Console data will populate the report once the site is live.
"""
import html as html_mod
from datetime import date, timedelta

# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def render_proposal(
    lead: dict,
    access: dict,
    pay_url: str = "",
    subscribe_url: str = "",
    public_url: str = "",
    build_fee: str = "£695",
    monthly_fee: str = "£59",
) -> str:
    esc = html_mod.escape
    name = lead.get("business_name", "")
    slug = access.get("slug", "")
    site_url = esc(f"{public_url}/p/{slug}/")
    gif_url = esc(f"{public_url}/p/{slug}/media/scroll.gif")
    today = date.today().strftime("%-d %B %Y")
    reply_to = lead.get("reply_to") or ""

    seo_section = _seo_report_preview(
        name=name,
        category=lead.get("category", ""),
        town=lead.get("town", ""),
    )

    pay_btn = ""
    if pay_url:
        pay_btn = (
            f'<a href="{esc(pay_url)}" class="btn-primary">'
            f'Pay {esc(build_fee)} to launch &rarr;</a>'
        )
    else:
        pay_btn = (
            '<p class="btn-placeholder">Payment link — set up in Leads &rarr; Settings</p>'
        )

    sub_btn = ""
    if subscribe_url:
        sub_btn = (
            f'<a href="{esc(subscribe_url)}" class="btn-secondary">'
            f'Set up {esc(monthly_fee)}/month direct debit &rarr;</a>'
        )
    else:
        sub_btn = (
            '<p class="btn-placeholder-sm">Stripe not configured — reply by email to arrange.</p>'
        )

    contact_line = (
        f'Questions? <a href="mailto:{esc(reply_to)}" class="reply-link">Reply to our email</a>'
        if reply_to else
        "Questions? Just reply to our email."
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{esc(name)} — your proposal · Designo Studio</title>
{_css()}
</head>
<body>

<!-- NAV -->
<nav class="topnav">
  <span class="topnav-brand">DESIGNO STUDIO</span>
  <span class="topnav-label">Private Proposal</span>
</nav>

<!-- HERO -->
<header class="hero">
  <p class="kicker">Prepared exclusively for</p>
  <h1 class="hero-name">{esc(name)}</h1>
  <p class="hero-date">{esc(today)}</p>
</header>

<!-- SITE PREVIEW -->
<section class="section">
  <p class="section-label">Your website — built and ready</p>
  <p class="section-intro">We've already built it. Click through to see it live.</p>
  <div class="browser-frame">
    <div class="browser-bar">
      <div class="browser-dots">
        <span class="dot dot-r"></span>
        <span class="dot dot-y"></span>
        <span class="dot dot-g"></span>
      </div>
      <div class="browser-url">nemx.co.uk/designo/p/{esc(slug)}/</div>
    </div>
    <a href="{site_url}" target="_blank" class="preview-link" title="Open your website">
      <img src="{gif_url}" alt="Preview of {esc(name)} website" class="preview-img"
           onerror="this.closest('.browser-frame').querySelector('.preview-placeholder').style.display='flex';this.style.display='none'">
      <div class="preview-placeholder" style="display:none">
        <div class="pp-inner">
          <p class="pp-icon">🌐</p>
          <p class="pp-text">Your website is live</p>
          <p class="pp-sub">Click to open it in a new tab</p>
        </div>
      </div>
    </a>
  </div>
  <a href="{site_url}" target="_blank" class="view-link">Open your live preview &rarr;</a>
</section>

<!-- RULE -->
<div class="rule-gold"></div>

<!-- THREE PILLARS -->
<section class="section">
  <p class="section-label">What you're getting</p>
  <div class="pillars">
    <div class="pillar">
      <span class="pillar-num">01</span>
      <h3 class="pillar-title">Cinematic website</h3>
      <p class="pillar-body">Scroll-driven motion, AI-commissioned artwork, and a design that moves as
      beautifully as it looks. Built by our AI creative director, tailored to your business.</p>
    </div>
    <div class="pillar">
      <span class="pillar-num">02</span>
      <h3 class="pillar-title">Reliable UK hosting</h3>
      <p class="pillar-body">Fast, redundant UK servers, SSL certificate, 99.9% uptime — all included
      in your monthly plan. We handle the tech so you don't have to.</p>
    </div>
    <div class="pillar">
      <span class="pillar-num">03</span>
      <h3 class="pillar-title">Weekly SEO + ASO report</h3>
      <p class="pillar-body">Every Monday morning: your Google visibility <em>and</em> your visibility to
      AI assistants — which AI crawlers read your site, who they sent you. Clear, jargon-free,
      and beautiful. See the sample below.</p>
    </div>
  </div>
</section>

<!-- RULE -->
<div class="rule-gold"></div>

<!-- THE SHIFT: AI vs traditional search -->
<section class="section">
  <p class="section-label">Why now — the numbers</p>
  <p class="section-intro">Search is changing faster than most businesses realise. This is what's already happened.</p>
  <div class="shift-grid">
    <div class="shift-stat">
      <p class="shift-num">800m</p>
      <p class="shift-desc">people a week now use ChatGPT — answering around 2 billion questions a day. Usage doubled in under a year.</p>
    </div>
    <div class="shift-stat">
      <p class="shift-num">~50%</p>
      <p class="shift-desc">of Google searches now show an AI-written answer at the top, reaching over 2 billion people every month.</p>
    </div>
    <div class="shift-stat">
      <p class="shift-num">&minus;60%</p>
      <p class="shift-desc">fewer clicks go to ordinary websites when that AI answer appears. 68% of searches now end with no click at all.</p>
    </div>
    <div class="shift-stat">
      <p class="shift-num">+1,200%</p>
      <p class="shift-desc">growth in visits sent by AI assistants in a single year — and those visitors convert at 2.5&times; the rate of Google search traffic.</p>
    </div>
  </div>
  <div class="shift-note">
    <p><strong>What this means for you:</strong> the businesses AI assistants can read are the ones they
    recommend — and AI-referred customers arrive readier to buy. That's exactly what your shadow site
    is for: while competitors wait to be found, you'll be legible to the machines doing the finding.</p>
  </div>
  <p class="shift-sources">Sources: OpenAI usage data; Google I/O; Seer Interactive CTR study 2025;
  SparkToro zero-click research 2026; Chartbeat publisher-traffic data 2025; Similarweb conversion analysis 2026.</p>
</section>

<!-- RULE -->
<div class="rule-gold"></div>

<!-- PRICING -->
<section class="section">
  <p class="section-label">Your investment</p>
  <div class="pricing-grid">

    <div class="pricing-card pricing-launch">
      <p class="pricing-tier">Launch</p>
      <div class="pricing-amount">{esc(build_fee)}</div>
      <p class="pricing-cadence">one-off &middot; card accepted</p>
      <hr class="pricing-hr">
      <ul class="pricing-list">
        <li>Bespoke cinematic motion website</li>
        <li>AI creative direction &amp; artwork</li>
        <li>Shadow site (AI-readable)</li>
        <li>Schema.org structured data</li>
        <li>SSL certificate &amp; setup</li>
        <li>Domain name — first year included</li>
        <li>Delivered within 24 hours</li>
      </ul>
    </div>

    <div class="pricing-card pricing-monthly">
      <p class="pricing-tier">Monthly</p>
      <div class="pricing-amount">{esc(monthly_fee)}<span class="pricing-per">&thinsp;/ mo</span></div>
      <p class="pricing-cadence">BACS direct debit &middot; cancel anytime</p>
      <hr class="pricing-hr">
      <ul class="pricing-list">
        <li>UK server hosting</li>
        <li>Weekly SEO + ASO report (every Monday)</li>
        <li>Google Search Console integration</li>
        <li>AI-agent visibility tracking</li>
        <li>Schema.org maintenance</li>
        <li>One content update per month</li>
        <li>Security &amp; performance monitoring</li>
        <li>24-hour support response</li>
      </ul>
    </div>

  </div>

  <div class="usp-callout">
    <span class="usp-badge">EXCLUSIVE</span>
    <p class="usp-text"><strong>Shadow site for AI agents.</strong>
    We build a machine-readable layer behind your website — structured for ChatGPT, Google AI Overview,
    and every AI assistant that's replacing traditional search. When someone asks an AI to recommend
    a <em>{esc((lead.get("category") or "business like yours").lower())}</em>, your details are there,
    in a format AI understands. No competitor in your area will have this.</p>
  </div>
</section>

<!-- RULE -->
<div class="rule-gold"></div>

<!-- SEO REPORT PREVIEW -->
<section class="section">
  <p class="section-label">Your weekly SEO + ASO report</p>
  <p class="section-intro">Every Monday morning, this arrives in your inbox. Real Google data — plus ASO:
  how visible you are to the AI assistants replacing search. No jargon.</p>
  {seo_section}
</section>

<!-- RULE -->
<div class="rule-gold"></div>

<!-- PAYMENT CTAs -->
<section class="section cta-section">
  <p class="section-label">Ready to launch?</p>
  <h2 class="cta-headline">Two steps to go live.</h2>

  <div class="cta-steps">
    <div class="cta-step">
      <div class="step-badge">1</div>
      <div class="step-body">
        <p class="step-title">Pay the launch fee</p>
        <p class="step-desc">{esc(build_fee)} covers the full build, creative direction, artwork,
        schema.org setup and your first month of hosting.</p>
        {pay_btn}
      </div>
    </div>
    <div class="cta-step">
      <div class="step-badge">2</div>
      <div class="step-body">
        <p class="step-title">Set up your monthly direct debit</p>
        <p class="step-desc">{esc(monthly_fee)}/month keeps your site online, your SEO growing, and
        your weekly report arriving every Monday. BACS settles in 3 business days.</p>
        {sub_btn}
      </div>
    </div>
  </div>

  <p class="cta-note">
    Both steps take under 3 minutes. Your site goes live within 24 hours of your launch payment
    clearing. {contact_line}
  </p>
</section>

<!-- RULE -->
<div class="rule-gold"></div>

<!-- FAQ -->
<section class="section">
  <p class="section-label">Common questions</p>
  <div class="faqs">
    <details class="faq">
      <summary class="faq-q">Do I own the website?</summary>
      <p class="faq-a">Yes — the content and design are yours. We're your hosting provider.
      If you ever want to move away, we'll export your files in full and help with the
      transfer. No lock-in.</p>
    </details>
    <details class="faq">
      <summary class="faq-q">What if I want changes after launch?</summary>
      <p class="faq-a">One content update per month is included in your {esc(monthly_fee)}/month plan —
      text, images, opening hours, new services. Additional changes are available at
      £50/hour, quoted in advance.</p>
    </details>
    <details class="faq">
      <summary class="faq-q">What about my domain name?</summary>
      <p class="faq-a">It's included. After payment you tell us your first and second choice of name
      and we register it — the first year is covered by the launch fee and renewals are covered by
      your monthly plan, so you never see a separate domain bill. Already own a domain? We'll
      connect that instead.</p>
    </details>
    <details class="faq">
      <summary class="faq-q">What exactly is the SEO + ASO report?</summary>
      <p class="faq-a">Two halves. SEO: your data from Google Search Console — how many times your
      site appeared in search results, how many people clicked, which queries you rank for, and where
      you can improve. ASO (agent search optimisation): how visible you are to AI assistants — which
      AI crawlers (ChatGPT's, Google's, Perplexity's, Claude's) read your site that week, how many
      customers an AI sent to you, and a health check on your machine-readable shadow site. Every
      Monday morning, clean and readable. No technical jargon.</p>
    </details>
    <details class="faq">
      <summary class="faq-q">Can I cancel the monthly plan?</summary>
      <p class="faq-a">Yes, with 30 days' notice at any point. No penalties, no questions asked.
      We'll always let you know in advance if anything is changing.</p>
    </details>
    <details class="faq">
      <summary class="faq-q">What is the shadow site?</summary>
      <p class="faq-a">It's a machine-readable version of your business, sitting alongside your
      website. It contains your services, location, opening hours and contact details in a format
      that AI assistants (ChatGPT, Google's AI overview, Perplexity etc.) can read directly.
      As AI replaces traditional Google searches, businesses with structured AI-readable data will
      appear in answers. Yours will be there from day one.</p>
    </details>
  </div>
</section>

<!-- FOOTER -->
<footer class="footer">
  <p class="footer-brand">DESIGNO STUDIO</p>
  <p class="footer-sub">Part of the Nemx Group &middot; nemx.co.uk</p>
  <p class="footer-legal">This proposal is private and prepared exclusively for {esc(name)}.
  Prices shown are exclusive of VAT where applicable.</p>
</footer>

</body>
</html>"""


def render_thank_you(lead: dict, payment_type: str = "payment") -> str:
    esc = html_mod.escape
    name = lead.get("business_name", "")
    if payment_type == "setup":
        headline = "Direct debit set up"
        body = (
            "Your monthly plan is now active. Your weekly SEO + ASO report will arrive "
            "every Monday morning, starting from your first full week online."
        )
    else:
        headline = "Payment received — thank you"
        body = (
            f"We're building {esc(name)}'s website now. It will be live within 24 hours. "
            "We'll email you the moment it's ready."
        )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Thank you — Designo Studio</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{min-height:100vh;display:grid;place-items:center;background:#07060504;
    color:#ddd9d0;font-family:Georgia,serif;padding:24px}}
  .card{{width:min(520px,100%);background:#0f0e0c;border:1px solid rgba(255,255,255,.08);
    border-radius:20px;padding:48px 44px;text-align:center}}
  .check{{width:56px;height:56px;border-radius:50%;background:rgba(62,207,120,.12);
    border:2px solid #3ecf78;display:flex;align-items:center;justify-content:center;
    margin:0 auto 24px;font-size:24px}}
  h1{{font-size:26px;font-weight:600;line-height:1.3;margin-bottom:14px}}
  p{{color:#a09c94;line-height:1.7;margin-bottom:24px}}
  .kicker{{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#706c64;margin-bottom:10px}}
  a.back{{display:inline-block;background:#c4a560;color:#07060504;text-decoration:none;
    border-radius:999px;padding:13px 28px;font-family:inherit;font-size:15px;font-weight:600}}
</style>
</head>
<body>
<div class="card">
  <div class="check">✓</div>
  <p class="kicker">Designo Studio</p>
  <h1>{esc(headline)}</h1>
  <p>{body}</p>
  <a class="back" href="./">Back to your website</a>
</div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# SEO report preview
# ---------------------------------------------------------------------------

def _seo_report_preview(name: str, category: str, town: str) -> str:
    esc = html_mod.escape
    queries = _sample_queries(category, town, name)
    action = _seo_action(category)
    today = date.today()
    week_end = today - timedelta(days=today.weekday() + 1)  # last Sunday
    week_start = week_end - timedelta(days=6)

    # 4-week labels (Mon–Sun)
    weeks = [(week_end - timedelta(weeks=3-i), week_end - timedelta(weeks=3-i) + timedelta(days=6))
             for i in range(4)]
    week_labels = [f"{s.strftime('%-d %b')}" for s, e in weeks]

    # SVG sparkline — impressions over 4 weeks
    # Chosen to look like a realistic new-site trajectory
    imp_data = [178, 520, 1109, 1247]
    svg_path, svg_area = _sparkline(imp_data, w=280, h=60, max_val=1400)
    schema_type = _schema_type(category)

    def query_rows(qs):
        rows = []
        for q in qs:
            rows.append(
                f'<tr>'
                f'<td class="qr-query">{esc(q["q"])}</td>'
                f'<td class="qr-num">{q["imp"]:,}</td>'
                f'<td class="qr-num">{q["clicks"]}</td>'
                f'<td class="qr-pos">{q["pos"]}</td>'
                f'</tr>'
            )
        return "\n".join(rows)

    return f"""
<div class="report-card">
  <!-- REPORT HEADER -->
  <div class="report-header">
    <div class="report-header-left">
      <p class="report-kicker">DESIGNO &middot; WEEKLY SEO + ASO REPORT</p>
      <p class="report-biz">{esc(name)}</p>
    </div>
    <div class="report-header-right">
      <p class="report-period">{week_start.strftime('%-d %b')} &ndash; {week_end.strftime('%-d %b %Y')}</p>
      <p class="report-note-small">SAMPLE REPORT</p>
    </div>
  </div>

  <!-- METRIC CARDS -->
  <div class="metrics-row">
    <div class="metric-card">
      <p class="metric-label">Impressions</p>
      <p class="metric-value">1,247</p>
      <p class="metric-delta metric-up">&#9650; 12% vs last week</p>
    </div>
    <div class="metric-card">
      <p class="metric-label">Clicks</p>
      <p class="metric-value">43</p>
      <p class="metric-delta metric-up">&#9650; 8% vs last week</p>
    </div>
    <div class="metric-card">
      <p class="metric-label">Avg. Position</p>
      <p class="metric-value">8.4</p>
      <p class="metric-delta metric-up">&#9650; 0.3 vs last week</p>
    </div>
  </div>

  <!-- SPARKLINE -->
  <div class="sparkline-section">
    <p class="sparkline-title">Impressions — 4 weeks</p>
    <svg viewBox="0 0 280 60" class="sparkline-svg" aria-hidden="true">
      <defs>
        <linearGradient id="sp-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c4a560" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#c4a560" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="{svg_area}" fill="url(#sp-grad)"/>
      <path d="{svg_path}" fill="none" stroke="#c4a560" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- dots -->
      <circle cx="0" cy="52" r="3" fill="#c4a560"/>
      <circle cx="93" cy="38" r="3" fill="#c4a560"/>
      <circle cx="187" cy="13" r="3" fill="#c4a560"/>
      <circle cx="280" cy="7" r="4" fill="#c4a560"/>
    </svg>
    <div class="sparkline-labels">
      <span>{esc(week_labels[0])}</span>
      <span>{esc(week_labels[1])}</span>
      <span>{esc(week_labels[2])}</span>
      <span class="sl-bold">{esc(week_labels[3])}</span>
    </div>
  </div>

  <!-- TOP QUERIES -->
  <div class="queries-section">
    <p class="queries-title">Top search queries</p>
    <table class="queries-table">
      <thead>
        <tr>
          <th class="qh-query">Query</th>
          <th class="qh-num">Searches</th>
          <th class="qh-num">Clicks</th>
          <th class="qh-num">Position</th>
        </tr>
      </thead>
      <tbody>
        {query_rows(queries)}
      </tbody>
    </table>
  </div>

  <!-- TECHNICAL HEALTH -->
  <div class="health-section">
    <p class="health-title">Technical health</p>
    <div class="health-grid">
      <div class="health-item health-ok">
        <span class="health-icon">&#10003;</span>
        <span>Schema.org ({esc(schema_type)})</span>
      </div>
      <div class="health-item health-ok">
        <span class="health-icon">&#10003;</span>
        <span>Mobile optimised</span>
      </div>
      <div class="health-item health-ok">
        <span class="health-icon">&#10003;</span>
        <span>SSL secure</span>
      </div>
      <div class="health-item health-gold">
        <span class="health-icon health-gold-icon">&#9670;</span>
        <span>AI-readable (agent.json, llms.txt)</span>
      </div>
      <div class="health-item health-pending">
        <span class="health-icon">&#9679;</span>
        <span>Google Business Profile — set up on launch</span>
      </div>
      <div class="health-item health-pending">
        <span class="health-icon">&#9679;</span>
        <span>Search Console — connected on launch</span>
      </div>
    </div>
  </div>

  <!-- AGENT VISIBILITY (ASO) -->
  <div class="aso-section">
    <div class="aso-header">
      <p class="aso-title">Agent visibility &mdash; ASO</p>
      <span class="aso-tag">AGENT SEARCH OPTIMISATION</span>
    </div>
    <p class="aso-sub">How visible your business is to AI assistants — the search that doesn&rsquo;t show up in Google&rsquo;s numbers.</p>
    <div class="aso-metrics">
      <div class="aso-metric">
        <p class="aso-num">33</p>
        <p class="aso-label">AI crawler visits this week</p>
        <p class="aso-detail">GPTBot 14 &middot; Google-Extended 9 &middot; PerplexityBot 6 &middot; ClaudeBot 4</p>
      </div>
      <div class="aso-metric">
        <p class="aso-num">5</p>
        <p class="aso-label">Visitors referred by AI assistants</p>
        <p class="aso-detail">ChatGPT 3 &middot; Perplexity 2 &mdash; AI referrals convert at ~2.5&times; search traffic</p>
      </div>
      <div class="aso-metric">
        <p class="aso-num">3/3</p>
        <p class="aso-label">Shadow site health</p>
        <p class="aso-detail">llms.txt served &#10003; &middot; agent.json valid &#10003; &middot; JSON-LD ({esc(schema_type)}) &#10003;</p>
      </div>
    </div>
  </div>

  <!-- ACTION OF THE WEEK -->
  <div class="action-section">
    <p class="action-title">This week&rsquo;s recommendation</p>
    <p class="action-body">{esc(action)}</p>
  </div>

  <!-- REPORT FOOTER -->
  <div class="report-footer">
    <span>Next report: {(week_end + timedelta(days=8)).strftime('Monday %-d %B %Y')}</span>
    <span class="report-footer-brand">Designo Studio</span>
  </div>
</div>
<p class="report-disclaimer">
  &#128204; This is a sample showing the format of the report you&rsquo;ll receive every Monday.
  Your real Google and AI-agent data populates it from the week your site launches.
</p>"""


# ---------------------------------------------------------------------------
# CSS
# ---------------------------------------------------------------------------

def _css() -> str:
    return """<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07060504;
  --surface:#0f0e0c;
  --surface2:#141210;
  --border:rgba(255,255,255,.07);
  --gold:#c4a560;
  --gold-dim:rgba(196,165,96,.14);
  --text:#ddd9d0;
  --muted:#706c64;
  --green:#3ecf78;
  --amber:#f0a429;
  --red:#e05a5a;
}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:16px;line-height:1.6}
a{color:var(--gold);text-decoration:none}
a:hover{text-decoration:underline}

/* NAV */
.topnav{display:flex;justify-content:space-between;align-items:center;
  padding:16px 32px;border-bottom:1px solid var(--border);position:sticky;top:0;
  background:rgba(7,6,5,.92);backdrop-filter:blur(12px);z-index:100}
.topnav-brand{font-size:11px;letter-spacing:3px;font-weight:600;color:var(--gold);font-family:Georgia,serif}
.topnav-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)}

/* HERO */
.hero{text-align:center;padding:80px 24px 64px;
  background:radial-gradient(ellipse 800px 400px at 50% -50%, rgba(196,165,96,.18) 0%, transparent 70%)}
.kicker{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);margin-bottom:14px}
.hero-name{font-family:Georgia,serif;font-size:clamp(28px,5vw,52px);font-weight:normal;
  letter-spacing:-0.5px;line-height:1.15;margin-bottom:12px}
.hero-date{font-size:13px;color:var(--muted)}

/* SECTIONS */
.section{max-width:860px;margin:0 auto;padding:64px 24px}
.section-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);
  margin-bottom:10px}
.section-intro{font-size:17px;color:#b9b4ac;margin-bottom:36px;max-width:600px}
.rule-gold{height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.25;
  max-width:860px;margin:0 auto}

/* BROWSER FRAME */
.browser-frame{border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;
  box-shadow:0 32px 80px rgba(0,0,0,.55);margin-bottom:16px;background:#161412}
.browser-bar{background:#1a1816;padding:10px 16px;display:flex;align-items:center;gap:12px;
  border-bottom:1px solid rgba(255,255,255,.07)}
.browser-dots{display:flex;gap:6px}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block}
.dot-r{background:#ff5f57}.dot-y{background:#febc2e}.dot-g{background:#28c840}
.browser-url{flex:1;background:rgba(255,255,255,.05);border-radius:6px;padding:4px 10px;
  font-size:12px;color:rgba(255,255,255,.35);font-family:monospace;overflow:hidden;
  white-space:nowrap;text-overflow:ellipsis}
.preview-link{display:block;position:relative}
.preview-img{width:100%;display:block;max-height:420px;object-fit:cover}
.preview-placeholder{min-height:280px;display:flex;align-items:center;justify-content:center;
  background:var(--surface2)}
.pp-inner{text-align:center;padding:40px}
.pp-icon{font-size:40px;margin-bottom:12px}
.pp-text{font-size:18px;color:var(--text);font-family:Georgia,serif;margin-bottom:6px}
.pp-sub{font-size:14px;color:var(--muted)}
.view-link{display:inline-block;color:var(--gold);font-size:14px;letter-spacing:.5px}

/* PILLARS */
.pillars{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;
  margin-top:16px}
.pillar{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px 24px}
.pillar-num{font-size:11px;letter-spacing:2px;color:var(--gold);display:block;margin-bottom:10px}
.pillar-title{font-family:Georgia,serif;font-size:19px;font-weight:normal;margin-bottom:10px}
.pillar-body{font-size:14px;color:#a09c94;line-height:1.65}

/* THE SHIFT */
.shift-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:24px}
.shift-stat{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:26px 24px}
.shift-num{font-family:Georgia,serif;font-size:40px;color:var(--gold);line-height:1;margin-bottom:12px}
.shift-desc{font-size:13.5px;color:#a09c94;line-height:1.6}
.shift-note{background:var(--gold-dim);border:1px solid rgba(196,165,96,.25);border-radius:14px;
  padding:20px 24px;margin-bottom:14px}
.shift-note p{font-size:14px;color:#c9c4bb;line-height:1.65}
.shift-note strong{color:var(--text)}
.shift-sources{font-size:11px;color:#4a4844;line-height:1.6}

/* PRICING */
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;
  margin-top:16px;margin-bottom:28px}
.pricing-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:32px 28px}
.pricing-launch{border-color:rgba(196,165,96,.4)}
.pricing-tier{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);
  margin-bottom:14px}
.pricing-amount{font-family:Georgia,serif;font-size:48px;font-weight:normal;line-height:1;
  margin-bottom:6px}
.pricing-per{font-size:22px;opacity:.7}
.pricing-cadence{font-size:13px;color:var(--muted);margin-bottom:20px}
.pricing-hr{border:none;border-top:1px solid var(--border);margin-bottom:20px}
.pricing-list{list-style:none;display:flex;flex-direction:column;gap:10px}
.pricing-list li{font-size:14px;color:#b9b4ac;padding-left:20px;position:relative}
.pricing-list li::before{content:'✓';position:absolute;left:0;color:var(--green);font-size:13px}
.usp-callout{background:var(--gold-dim);border:1px solid rgba(196,165,96,.25);border-radius:14px;
  padding:22px 24px;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
.usp-badge{font-size:10px;letter-spacing:2px;background:var(--gold);color:#07060504;border-radius:4px;
  padding:3px 8px;flex-shrink:0;margin-top:2px;font-weight:700}
.usp-text{font-size:14px;color:#c9c4bb;line-height:1.65}
.usp-text strong{color:var(--text)}
.usp-text em{font-style:italic;color:var(--gold)}

/* CTA */
.cta-section{text-align:center}
.cta-headline{font-family:Georgia,serif;font-size:clamp(22px,3vw,34px);font-weight:normal;
  margin:12px 0 40px}
.cta-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;
  margin-bottom:32px;text-align:left}
.cta-step{background:var(--surface);border:1px solid var(--border);border-radius:16px;
  padding:28px;display:flex;gap:20px;align-items:flex-start}
.step-badge{width:36px;height:36px;border-radius:50%;background:var(--gold-dim);
  border:1px solid rgba(196,165,96,.35);display:flex;align-items:center;justify-content:center;
  font-family:Georgia,serif;font-size:18px;color:var(--gold);flex-shrink:0}
.step-title{font-family:Georgia,serif;font-size:17px;font-weight:normal;margin-bottom:8px}
.step-desc{font-size:14px;color:#a09c94;line-height:1.6;margin-bottom:18px}
.btn-primary{display:inline-block;background:var(--gold);color:#07060504;border-radius:999px;
  padding:13px 28px;font-size:15px;font-weight:600;font-family:inherit;text-decoration:none;
  transition:opacity .2s}
.btn-primary:hover{opacity:.85;text-decoration:none}
.btn-secondary{display:inline-block;border:1.5px solid var(--gold);color:var(--gold);
  border-radius:999px;padding:12px 26px;font-size:15px;font-family:inherit;text-decoration:none;
  transition:opacity .2s}
.btn-secondary:hover{opacity:.75;text-decoration:none}
.btn-placeholder{font-size:13px;color:var(--muted);font-style:italic}
.btn-placeholder-sm{font-size:13px;color:var(--muted)}
.cta-note{font-size:14px;color:var(--muted);max-width:560px;margin:0 auto;line-height:1.7}
.reply-link{color:var(--gold)}

/* FAQ */
.faqs{display:flex;flex-direction:column;gap:2px;margin-top:16px}
.faq{border-bottom:1px solid var(--border)}
.faq-q{padding:18px 0;cursor:pointer;font-size:16px;color:var(--text);list-style:none;
  display:flex;justify-content:space-between;align-items:center;font-family:Georgia,serif}
.faq-q::after{content:'+';color:var(--gold);font-size:20px;line-height:1;flex-shrink:0;margin-left:12px}
details[open] .faq-q::after{content:'−'}
.faq-a{padding:0 0 20px;font-size:14px;color:#a09c94;line-height:1.7;max-width:680px}

/* FOOTER */
.footer{border-top:1px solid var(--border);padding:48px 24px;text-align:center}
.footer-brand{font-size:11px;letter-spacing:3px;color:var(--gold);font-family:Georgia,serif;margin-bottom:8px}
.footer-sub{font-size:13px;color:var(--muted);margin-bottom:8px}
.footer-legal{font-size:12px;color:#4a4844;line-height:1.6;max-width:480px;margin:0 auto}

/* SEO REPORT */
.report-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;
  overflow:hidden;margin-bottom:12px}
.report-header{display:flex;justify-content:space-between;align-items:flex-start;
  padding:22px 28px 18px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:12px}
.report-kicker{font-size:10px;letter-spacing:3px;color:var(--muted);margin-bottom:4px}
.report-biz{font-family:Georgia,serif;font-size:18px;color:var(--text)}
.report-period{font-size:13px;color:var(--muted);text-align:right}
.report-note-small{font-size:9px;letter-spacing:2px;text-transform:uppercase;
  color:var(--gold);margin-top:4px;text-align:right}
.metrics-row{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--border)}
.metric-card{padding:22px 20px;border-right:1px solid var(--border)}
.metric-card:last-child{border-right:none}
.metric-label{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.metric-value{font-family:Georgia,serif;font-size:32px;line-height:1;margin-bottom:6px}
.metric-delta{font-size:12px}
.metric-up{color:var(--green)}
.metric-down{color:var(--red)}
.sparkline-section{padding:22px 28px;border-bottom:1px solid var(--border)}
.sparkline-title{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
.sparkline-svg{width:100%;max-width:280px;height:60px;display:block;overflow:visible}
.sparkline-labels{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);
  margin-top:6px;max-width:280px}
.sl-bold{color:var(--text);font-weight:600}
.queries-section{padding:22px 28px;border-bottom:1px solid var(--border)}
.queries-title{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px}
.queries-table{width:100%;border-collapse:collapse;font-size:13px}
.queries-table thead tr{border-bottom:1px solid var(--border)}
.qh-query{text-align:left;padding:0 0 8px;color:var(--muted);font-weight:normal;font-size:11px;letter-spacing:1px;text-transform:uppercase}
.qh-num{text-align:right;padding:0 0 8px 16px;color:var(--muted);font-weight:normal;font-size:11px;letter-spacing:1px;text-transform:uppercase}
.queries-table tbody tr{border-bottom:1px solid rgba(255,255,255,.04)}
.queries-table tbody tr:last-child{border-bottom:none}
.qr-query{padding:9px 0;color:var(--text)}
.qr-num{text-align:right;padding:9px 0 9px 16px;color:#a09c94;font-variant-numeric:tabular-nums}
.qr-pos{text-align:right;padding:9px 0 9px 16px;color:var(--gold);font-variant-numeric:tabular-nums}
.health-section{padding:22px 28px;border-bottom:1px solid var(--border)}
.health-title{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px}
.health-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.health-item{display:flex;align-items:center;gap:8px;font-size:13px;color:#a09c94}
.health-ok .health-icon{color:var(--green)}
.health-gold{color:#c9c4bb}
.health-gold-icon{color:var(--gold)}
.health-pending{color:var(--muted)}
.health-pending .health-icon{font-size:8px;color:var(--amber)}
.aso-section{padding:22px 28px;border-bottom:1px solid var(--border);
  background:linear-gradient(135deg, rgba(196,165,96,.06) 0%, transparent 60%)}
.aso-header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.aso-title{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold)}
.aso-tag{font-size:8.5px;letter-spacing:1.5px;background:rgba(196,165,96,.15);color:var(--gold);
  border:1px solid rgba(196,165,96,.3);border-radius:4px;padding:2px 7px}
.aso-sub{font-size:12.5px;color:var(--muted);margin-bottom:16px}
.aso-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}
.aso-metric{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:12px;padding:16px 16px}
.aso-num{font-family:Georgia,serif;font-size:26px;color:var(--gold);line-height:1;margin-bottom:8px}
.aso-label{font-size:12.5px;color:var(--text);margin-bottom:6px}
.aso-detail{font-size:11px;color:var(--muted);line-height:1.5}
.action-section{padding:22px 28px;background:var(--gold-dim);border-bottom:1px solid var(--border)}
.action-title{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
.action-body{font-size:14px;color:var(--text);line-height:1.65;max-width:560px}
.report-footer{display:flex;justify-content:space-between;padding:14px 28px;
  font-size:12px;color:var(--muted);flex-wrap:wrap;gap:8px}
.report-footer-brand{letter-spacing:1.5px;font-size:10px;text-transform:uppercase;color:var(--muted)}
.report-disclaimer{font-size:12px;color:var(--muted);text-align:center;padding:0 8px;line-height:1.6}

@media(max-width:600px){
  .metrics-row{grid-template-columns:1fr}
  .metric-card{border-right:none;border-bottom:1px solid var(--border)}
  .metric-card:last-child{border-bottom:none}
  .pricing-grid,.pillars,.cta-steps{grid-template-columns:1fr}
  .topnav{padding:14px 20px}
  .hero{padding:60px 20px 48px}
  .section{padding:48px 20px}
}
</style>"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sparkline(data: list[int], w: int, h: int, max_val: int) -> tuple[str, str]:
    """Return (line_path, area_path) SVG d-attributes for a simple polyline sparkline."""
    n = len(data)
    xs = [round(i * w / (n - 1)) for i in range(n)]
    ys = [round(h - (v / max_val) * h) for v in data]
    pts = " ".join(f"{x},{y}" for x, y in zip(xs, ys))
    line = f"M {pts.replace(' ', ' L ')}"
    area = f"M 0,{h} L {pts.replace(' ', ' L ')} L {xs[-1]},{h} Z"
    return line, area


def _sample_queries(category: str, town: str, name: str) -> list[dict]:
    cat_words = (category or "local business").lower().split()
    cat = cat_words[0] if cat_words else "business"
    t = (town or "").lower() or "your area"
    n = (name or "").lower()[:28]

    return [
        {"q": f"{cat} {t}", "imp": 312, "clicks": 18, "pos": 4.2},
        {"q": f"{cat} near me", "imp": 289, "clicks": 11, "pos": 6.8},
        {"q": n or f"best {cat}", "imp": 201, "clicks": 9, "pos": 2.1},
        {"q": f"{cat} {t} prices", "imp": 178, "clicks": 5, "pos": 9.3},
        {"q": f"local {cat}", "imp": 134, "clicks": 3, "pos": 14.7},
    ]


def _seo_action(category: str) -> str:
    cat = (category or "").lower()
    if any(w in cat for w in ("roof", "plumb", "electr", "build", "construct", "carpet",
                               "paint", "decorat", "landscap", "garden")):
        return (
            "Ask 3 satisfied customers for a Google review this week — customer reviews are the "
            "single strongest local ranking signal for trades businesses. A short, honest review "
            "outperforms any paid ad for local search visibility."
        )
    if any(w in cat for w in ("restaurant", "café", "cafe", "bar", "pub", "food", "pizza",
                               "takeaway", "bakery")):
        return (
            "Update your Google Business Profile with current opening hours and any seasonal menu. "
            "Search engines surface venues with fresh, accurate Business Profile data ahead of "
            "competitors who haven't updated theirs."
        )
    if any(w in cat for w in ("salon", "barber", "beauty", "spa", "nail", "hair")):
        return (
            "Add a 'Book online' link to your Google Business Profile. Profiles with booking links "
            "receive 3× more click-throughs than those without, particularly on mobile searches."
        )
    if any(w in cat for w in ("solicitor", "accountant", "financial", "advisor", "consult",
                               "architect", "surveyor")):
        return (
            "Publish a short FAQ page (300–400 words) answering your clients' most common question. "
            "Google prioritises pages that directly answer conversational queries — this is low "
            "effort and consistently delivers strong position improvements within 4–6 weeks."
        )
    return (
        "Create or verify your Google Business Profile — it's free and directly boosts local search "
        "visibility. Businesses with a verified profile appear in 'near me' searches and on Google Maps, "
        "generating twice as many leads as those without one."
    )


def _schema_type(category: str) -> str:
    cat = (category or "").lower()
    mapping = {
        "roof": "RoofingContractor",
        "plumb": "Plumber",
        "electr": "Electrician",
        "dentist": "Dentist",
        "solicitor": "LegalService",
        "accountant": "AccountingService",
        "restaurant": "Restaurant",
        "café": "CafeOrCoffeeShop",
        "cafe": "CafeOrCoffeeShop",
        "salon": "HairSalon",
        "barber": "BarberShop",
        "hotel": "Hotel",
        "gym": "SportsActivityLocation",
        "architect": "ProfessionalService",
        "surveyor": "ProfessionalService",
    }
    for key, val in mapping.items():
        if key in cat:
            return val
    return "LocalBusiness"
