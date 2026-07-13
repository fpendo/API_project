import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import Shell from '../components/Shell'

/* ------------------------------------------------------------------ */
/* Building blocks for the visual pipeline                             */
/* ------------------------------------------------------------------ */

const PHASE_COLORS: Record<string, { border: string; bg: string; text: string; chip: string }> = {
  find: { border: 'border-sky-500/40', bg: 'bg-sky-500/5', text: 'text-sky-300', chip: 'bg-sky-500/15 border-sky-500/30 text-sky-300' },
  build: { border: 'border-violet-500/40', bg: 'bg-violet-500/5', text: 'text-violet-300', chip: 'bg-violet-500/15 border-violet-500/30 text-violet-300' },
  pitch: { border: 'border-amber-500/40', bg: 'bg-amber-500/5', text: 'text-amber-300', chip: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
  close: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', text: 'text-emerald-300', chip: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' },
}

function Stage({ phase, num, title, sub, items }: {
  phase: keyof typeof PHASE_COLORS
  num: string
  title: string
  sub: string
  items: string[]
}) {
  const c = PHASE_COLORS[phase]
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 flex-1 min-w-[210px]`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${c.chip}`}>{num}</span>
        <p className="font-display font-semibold text-sm">{title}</p>
      </div>
      <p className="text-xs text-text-muted mb-2.5 leading-relaxed">{sub}</p>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it} className="text-xs text-text-secondary flex gap-1.5 leading-relaxed">
            <span className={`shrink-0 ${c.text}`}>·</span>{it}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Arrow() {
  return (
    <div className="hidden lg:flex items-center shrink-0 text-text-muted px-0.5" aria-hidden>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h14m0 0-5-5m5 5-5 5" />
      </svg>
    </div>
  )
}

function DownArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3 pl-2" aria-hidden>
      <svg className="text-text-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v14m0 0 5-5m-5 5-5-5" />
      </svg>
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted">{label}</span>
    </div>
  )
}

function PhaseLabel({ phase, children }: { phase: keyof typeof PHASE_COLORS; children: ReactNode }) {
  const c = PHASE_COLORS[phase]
  return (
    <p className={`font-mono text-[11px] tracking-[0.25em] uppercase mb-3 ${c.text}`}>{children}</p>
  )
}

/* ------------------------------------------------------------------ */
/* Write-up building blocks                                            */
/* ------------------------------------------------------------------ */

function Section({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.35 }}
      className="glass-card p-7"
    >
      <p className="text-accent-secondary font-mono text-[11px] tracking-[0.25em] uppercase mb-1.5">{kicker}</p>
      <h2 className="font-display font-bold text-xl mb-4">{title}</h2>
      <div className="space-y-3 text-sm text-text-secondary leading-relaxed">{children}</div>
    </motion.section>
  )
}

function Fact({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="text-text-muted w-44 shrink-0">{k}</dt>
      <dd className="min-w-0">{v}</dd>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function Playbook() {
  return (
    <Shell wide>
      <div className="mb-10">
        <p className="text-accent-secondary font-mono text-xs tracking-[0.25em] uppercase mb-2">The system</p>
        <h1 className="font-display font-bold text-3xl md:text-4xl mb-2">Playbook — how it all works</h1>
        <p className="text-text-muted max-w-3xl">
          The whole machine on one page: how leads are found and scored, how their website gets built
          before they've ever spoken to us, how the pitch lands, and what happens after they pay.
        </p>
      </div>

      {/* ============================ THE PIPELINE ============================ */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="glass-card p-7 mb-10"
      >
        <h2 className="font-display font-bold text-xl mb-1">The pipeline</h2>
        <p className="text-text-muted text-sm mb-7">
          Four phases. Everything up to "Approve &amp; send" is automatic; a human approves every email before it leaves.
        </p>

        {/* FIND */}
        <PhaseLabel phase="find">Phase 1 — Find &amp; qualify</PhaseLabel>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-stretch">
          <Stage phase="find" num="01" title="Discover" sub="Real local businesses with a website problem."
            items={[
              'Google Maps via Apify (UK-pinned) — no website at all, or dated website',
              'South West sweep: categories × 27 towns, services only',
              'Companies House (new incorporations) & CSV import',
              'Deduped by name + postcode',
            ]} />
          <Arrow />
          <Stage phase="find" num="02" title="Audit" sub="Two-stage: cheap technical pre-filter, then a design judgement."
            items={[
              'Technical: viewport, HTTPS, stale copyright, legacy markup… (score ≥ 4 proceeds)',
              'Creative director: stealth screenshot → Fable vision scores the design 1-10',
              'Verdicts: rebuild / borderline / modern (skip) / dead (best lead)',
              'E-commerce & product sellers filtered out',
            ]} />
          <Arrow />
          <Stage phase="find" num="03" title="Score & rank" sub="One number says how big the opportunity is."
            items={[
              'Opportunity score 0-100 on every audited lead',
              'Dead or unreachable site = 100',
              'Else (10 − design) × 8 + technical (cap 20)',
              'Leads board sorts worst-first — biggest opportunities on top',
            ]} />
        </div>

        <DownArrow label="qualified lead — run pipeline" />

        {/* BUILD */}
        <PhaseLabel phase="build">Phase 2 — Build the pitch asset</PhaseLabel>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-stretch">
          <Stage phase="build" num="04" title="Brief" sub="Fable writes the questionnaire as if it interviewed them."
            items={[
              'If they have a site: it\u2019s scraped (homepage + 5 key pages) as ground truth',
              'Their real services, story, team, accreditations & testimonials are kept',
              'No site: industry-typical truths inferred from listing data',
            ]} />
          <Arrow />
          <Stage phase="build" num="05" title="Motion site" sub="The standard two-stage cinematic build."
            items={[
              'Concept stage: creative direction + artwork commissions',
              'Zero photos → 6-10 AI artworks generated',
              'Scroll-driven single-file site (GSAP / Lenis)',
              'Shadow site: llms.txt, agent.json, JSON-LD for AI agents',
            ]} />
          <Arrow />
          <Stage phase="build" num="06" title="Email draft" sub="Preview media + a personal note, queued for approval."
            items={[
              'Hero screenshot + animated scroll GIF captured',
              'Fable drafts the pitch — audit-aware for dated sites',
              '\u201cWhat we found on your current site\u201d findings box',
              'Private login credentials generated',
            ]} />
        </div>

        <DownArrow label="human approves — nothing sends itself" />

        {/* PITCH */}
        <PhaseLabel phase="pitch">Phase 3 — Pitch &amp; converse</PhaseLabel>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-stretch">
          <Stage phase="pitch" num="07" title="Send & track" sub="The email leads with their finished site, not a sales pitch."
            items={[
              'Sent via Resend with unsubscribe + suppression list',
              'Tracked: delivered → opened → logged in',
              'GIF load = own open signal',
              'Every touch on the lead timeline',
            ]} />
          <Arrow />
          <Stage phase="pitch" num="08" title="Prospect visits" sub="A private, password-protected preview of their own site."
            items={[
              'Branded login at /p/their-slug/',
              'Analytics beacon: views, scroll depth, time on page',
              'Pricing panel + link to full proposal',
              'Replies land in the portal Mailbox, matched to the lead',
            ]} />
          <Arrow />
          <Stage phase="pitch" num="09" title="Proposal" sub="The follow-up pack that does the closing."
            items={[
              'Editorial dark/gold page with their scroll preview',
              'Sample weekly SEO + ASO report',
              '\u201cWhy now\u201d — AI-search statistics',
              'Two Stripe CTAs: £695 build, £59/mo care plan',
            ]} />
        </div>

        <DownArrow label="payment received — stripe webhook flips the lead to won" />

        {/* CLOSE */}
        <PhaseLabel phase="close">Phase 4 — Close &amp; run</PhaseLabel>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-stretch">
          <Stage phase="close" num="10" title="Payment" sub="Stripe carries the lead ID — payments can never be mismatched."
            items={[
              '£695 one-off (card) — the build & launch',
              '£59/month (BACS direct debit or card) — hosting, updates, SEO + ASO',
              'lead_id in session metadata links money to website',
            ]} />
          <Arrow />
          <Stage phase="close" num="11" title="Welcome pack" sub="Fires automatically when the payment clears."
            items={[
              'Next-steps timeline: domain → live in 24h → indexing',
              'One ask: reply with 1st/2nd choice domain name',
              'Domain cost absorbed — never a third bill',
            ]} />
          <Arrow />
          <Stage phase="close" num="12" title="Live & reporting" sub="The ongoing relationship the £59/month pays for."
            items={[
              'Site hosted & maintained by Twin Native',
              'Weekly SEO + ASO report every Monday',
              'Google visibility and AI-agent visibility, both measured',
            ]} />
        </div>
      </motion.div>

      {/* ============================ WRITE-UP ============================ */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Section kicker="Phase 1" title="Finding & qualifying leads">
          <p>
            Two kinds of prospect enter the funnel. <strong className="text-text-primary">No-website businesses</strong> come
            from Google Maps (filtered to listings without a website) and Companies House new incorporations — they trade,
            they have reviews, they demonstrably lack a site. <strong className="text-text-primary">Dated-website businesses</strong> come
            from the same Maps data but with a site attached, and each candidate is audited before it's allowed to become a lead.
          </p>
          <p>
            The audit runs in two stages. A <strong className="text-text-primary">technical pass</strong> fetches the homepage and
            scores age signals — no mobile viewport, no HTTPS, copyright frozen years ago, Flash, framesets, jQuery 1.x, no
            structured data. That's cheap but crude: a site can fail every check and still look fine to a customer. So sites
            that score 4+ get a <strong className="text-text-primary">creative-director review</strong>: a stealth headless-browser
            screenshot (it waits out Cloudflare and captcha walls, dismisses cookie banners) is judged by Fable vision as a
            design director in 2026. Design 1-3 is a <em>rebuild</em> — the bread-and-butter lead. 4-5 is <em>borderline</em>.
            6+ looks <em>modern</em> and is skipped; we never pitch a redesign at a decent site. A <em>dead</em> verdict
            (parking page, "site not published") is the best lead of all.
          </p>
          <p>
            The <strong className="text-text-primary">opportunity score</strong> compresses this to one number: dead or unreachable
            = 100; otherwise (10 − design score) × 8 plus the technical score capped at 20. The Leads board sorts by it,
            worst site first.
          </p>
        </Section>

        <Section kicker="Phase 2" title="Building the site before they've asked">
          <p>
            The pitch asset is a <strong className="text-text-primary">finished website, not a mockup sketch</strong>. Fable first
            writes the full questionnaire brief on the business's behalf. If they already have a site, it is scraped —
            homepage plus up to five key pages (about, services, testimonials, contact) — and that content is treated as
            ground truth: their real services, their real story, their real team and accreditations, their published
            testimonials. The rebuild feels like <em>their business upgraded</em>, not a generic template for their trade.
          </p>
          <p>
            The build itself is the standard two-stage Twin Native pipeline: a concept stage sets the creative direction and
            commissions 6-10 AI artworks (no client photos exist yet), then the site stage produces a scroll-driven,
            cinematic single-file website. Every build also ships the <strong className="text-text-primary">shadow site</strong> —
            llms.txt, agent.json and schema.org JSON-LD — so the business is legible to AI assistants from day one. That's
            the ASO half of the weekly report, and the core of the agent-economy pitch.
          </p>
          <p>
            Playwright then captures a hero screenshot and an animated scroll GIF for the email, credentials are generated
            for their private preview, and Fable drafts the pitch. For dated-site prospects the email is audit-aware: it
            mentions the one or two most damaging findings conversationally and includes a "what we found on your current
            site" box — respectful, never mocking.
          </p>
        </Section>

        <Section kicker="Phase 3" title="The pitch, the visit, the proposal">
          <p>
            Nothing sends itself. Every draft stops in the <strong className="text-text-primary">review queue</strong> where the
            email can be edited before "Approve &amp; send". Sends go out through Resend with proper unsubscribe handling and
            a suppression list; delivery, opens and logins are tracked back onto the lead timeline.
          </p>
          <p>
            The email's centrepiece is the animated preview of <em>their</em> site plus private login details. Their preview
            at <code className="text-text-primary">/p/their-name/</code> is password-protected and instrumented — page views,
            scroll depth, time on page — so you can see exactly how warm a prospect is before they've replied. Replies land
            in the portal <strong className="text-text-primary">Mailbox</strong>, threaded and matched to the lead automatically.
          </p>
          <p>
            Interested prospects get the <strong className="text-text-primary">follow-up pack</strong>: an editorial proposal page
            with their scroll preview, the pricing explained line by line, a sample weekly SEO + ASO report, the AI-search
            statistics that make the "why now" case, an FAQ, and the two payment buttons. Because every site is priced the
            same, the only personalised parts are their preview and their links — the canned follow-up in the Mailbox drops
            straight into any reply.
          </p>
        </Section>

        <Section kicker="Phase 4" title="Money, welcome, and the weekly report">
          <p>
            Payments run on Stripe: <strong className="text-text-primary">£695 one-off</strong> for the build and launch, and
            <strong className="text-text-primary"> £59/month</strong> (BACS direct debit or card) for hosting, updates and the
            ongoing SEO + ASO work. The lead's ID travels inside the Stripe session metadata, so a payment can only ever
            match its own website. The webhook flips the lead to <em>won</em> and fires the welcome pack automatically.
          </p>
          <p>
            The welcome pack confirms payment and asks for exactly one thing: a first and second choice of domain name.
            Domain costs are <strong className="text-text-primary">absorbed, never itemised</strong> — the first year lives inside
            the £695, renewals inside the £59/month — so the client never sees a third bill. Twin Native registers and connects
            the domain, the site goes live within 24 hours, and Search Console indexing is set up.
          </p>
          <p>
            From then on it's the care plan: every Monday a <strong className="text-text-primary">weekly SEO + ASO report</strong> —
            Google visibility (clicks, impressions, top queries, technical health) alongside agent visibility (AI crawler
            visits by bot, visitors referred by ChatGPT/Perplexity, shadow-site health checks). All of it genuinely
            measurable from server logs and file checks.
          </p>
        </Section>

        <Section kicker="Reference" title="Key facts & numbers">
          <dl className="space-y-2">
            <Fact k="Pricing" v={<span><strong className="text-text-primary">£695</strong> one-off build · <strong className="text-text-primary">£59/month</strong> hosting, updates, SEO + ASO</span>} />
            <Fact k="Domain policy" v="Absorbed — year one inside the £695, renewals inside the £59/month" />
            <Fact k="Pipeline runtime" v="~15 minutes per lead (brief ~1 min, concept + artwork ~8, site ~5, media + email ~2)" />
            <Fact k="Opportunity score" v="Dead/unreachable = 100 · else (10 − design) × 8 + technical (cap 20) · red ≥ 60, amber ≥ 40" />
            <Fact k="Design verdicts" v="rebuild 1-3 · borderline 4-5 · modern 6-10 (skipped) · dead = top priority" />
            <Fact k="Lead statuses" v="new → researching → generating → drafting → review → sent → opened → logged in → won / lost" />
            <Fact k="Audit cost" v="~$0.01-0.03 vision call + one screenshot per candidate site" />
            <Fact k="Payment link" v="lead_id in Stripe session metadata — payment can never mismatch a website" />
            <Fact k="Human gate" v="Every outbound email requires explicit approval in the review queue" />
          </dl>
        </Section>

        <Section kicker="Reference" title="The agent-economy angle">
          <p>
            The differentiator isn't just that the sites look cinematic — it's that they're built for
            <strong className="text-text-primary"> where search is going</strong>. AI assistants now answer a huge share of
            "find me a local tradesperson" questions, and they can only recommend businesses they can read.
          </p>
          <p>
            Every Twin Native site ships a machine-readable shadow layer: <code className="text-text-primary">llms.txt</code> for
            language models, <code className="text-text-primary">agent.json</code> describing services and actions (request a
            quote, call), a semantic microdata page, and schema.org JSON-LD in the head. Most local businesses — and most
            web agencies — have none of this. The weekly report then proves it's working: AI crawler visits, AI-referred
            visitors (which convert at roughly 2.5× search traffic), and shadow-file health, all shown next to the
            traditional Google numbers.
          </p>
          <p>
            The pitch writes itself: <em>"your current site is invisible to the tools your next customers already use —
            the one we've built for you isn't."</em>
          </p>
        </Section>
      </div>
    </Shell>
  )
}
