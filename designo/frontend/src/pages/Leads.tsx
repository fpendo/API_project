import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../api'
import { AppConfig, DiscoveryJob, Lead, LeadStatus, LEAD_TRANSIENT } from '../types'

const STATUS_META: Record<LeadStatus, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  researching: { label: 'Researching…', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  generating: { label: 'Building site…', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  drafting: { label: 'Drafting email…', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  review: { label: 'Ready for review', cls: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  sending: { label: 'Sending…', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  sent: { label: 'Sent', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  opened: { label: 'Opened email', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  logged_in: { label: 'Viewed site', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  won: { label: 'Won', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  lost: { label: 'Lost', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  skipped: { label: 'Skipped', cls: 'bg-slate-600/20 text-slate-400 border-slate-600/30' },
  error: { label: 'Error', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
}

export function LeadBadge({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.new
  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

const FILTERS: { id: string; label: string; statuses: LeadStatus[] | null }[] = [
  { id: 'all', label: 'All', statuses: null },
  { id: 'new', label: 'New', statuses: ['new'] },
  { id: 'working', label: 'In progress', statuses: ['researching', 'generating', 'drafting', 'sending'] },
  { id: 'review', label: 'To review', statuses: ['review'] },
  { id: 'live', label: 'Sent & tracking', statuses: ['sent', 'opened', 'logged_in'] },
  { id: 'closed', label: 'Won / Lost', statuses: ['won', 'lost'] },
  { id: 'problem', label: 'Errors', statuses: ['error'] },
]

export default function Leads() {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [job, setJob] = useState<DiscoveryJob | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const refresh = useCallback(() => {
    api.listLeads().then(setLeads).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    refresh()
    api.config().then(setConfig).catch(() => {})
  }, [refresh])

  // Poll while anything is moving
  const busy = (leads ?? []).some((l) => LEAD_TRANSIENT.includes(l.status)) || job?.status === 'running'
  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => {
      refresh()
      if (job && job.status === 'running') {
        api.discoveryStatus(job.id).then(setJob).catch(() => {})
      }
    }, 4000)
    return () => clearInterval(t)
  }, [busy, job, refresh])

  // Worst site first — biggest opportunities at the top; leads without an
  // audited website (no-website leads etc.) follow, newest first.
  const visible = (leads ?? [])
    .filter((l) => {
      const f = FILTERS.find((x) => x.id === filter)
      return !f?.statuses || f.statuses.includes(l.status)
    })
    .sort((a, b) => {
      const sa = a.opportunity_score
      const sb = b.opportunity_score
      if (sa != null && sb != null && sb !== sa) return sb - sa
      if (sa != null && sb == null) return -1
      if (sa == null && sb != null) return 1
      return b.created_at - a.created_at
    })

  const counts = (statuses: LeadStatus[] | null) =>
    statuses === null ? (leads ?? []).length : (leads ?? []).filter((l) => statuses.includes(l.status)).length

  return (
    <Shell wide>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-accent-secondary font-mono text-xs tracking-[0.25em] uppercase mb-2">Lead engine</p>
          <h1 className="font-display font-bold text-3xl md:text-4xl mb-1">Leads</h1>
          <p className="text-text-muted">Find businesses without websites, build them one, pitch it — you approve every send.</p>
        </div>
        <button className="btn-ghost !py-2 text-sm" onClick={() => setShowSettings((s) => !s)}>
          {showSettings ? 'Hide settings' : 'Pricing & sender settings'}
        </button>
      </div>

      {error && (
        <p className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
      )}

      {showSettings && <SettingsPanel />}

      <DiscoveryPanel config={config} job={job} onJob={setJob} onImported={refresh} />

      <div className="flex items-center gap-2 flex-wrap mb-6">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
              filter === f.id
                ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                : 'border-border text-text-muted hover:text-text-primary'
            }`}>
            {f.label} <span className="text-text-muted">({counts(f.statuses)})</span>
          </button>
        ))}
      </div>

      {leads === null ? (
        <p className="text-text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="font-display text-xl mb-2">No leads here yet</p>
          <p className="text-text-muted">Run a discovery above or import a CSV to fill the pipeline.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((l, i) => (
            <motion.div key={l.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}>
              <Link to={`/leads/${l.id}`}
                className="glass-card px-5 py-4 flex items-center gap-4 hover:border-accent-primary/50 transition-colors duration-200 block">
                {l.opportunity_score != null && (
                  <div className={`shrink-0 w-14 h-14 rounded-xl border flex flex-col items-center justify-center ${
                    l.opportunity_score >= 60 ? 'border-red-500/50 bg-red-500/10 text-red-300'
                    : l.opportunity_score >= 40 ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                    : 'border-slate-500/40 bg-slate-500/10 text-slate-300'}`}>
                    <span className="font-display font-bold text-lg leading-none">{l.opportunity_score}</span>
                    <span className="text-[9px] font-mono uppercase tracking-wider mt-1 opacity-70">opp.</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-display font-semibold truncate">{l.business_name}</span>
                    <LeadBadge status={l.status} />
                  </div>
                  <p className="text-text-muted text-sm truncate mt-0.5">
                    {[l.category, l.town].filter(Boolean).join(' · ') || l.source}
                    {l.rating ? ` · ★ ${l.rating}${l.reviews_count ? ` (${l.reviews_count})` : ''}` : ''}
                  </p>
                  {l.status_detail && LEAD_TRANSIENT.includes(l.status) && (
                    <p className="text-amber-300/80 text-xs mt-1 truncate">{l.status_detail}</p>
                  )}
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-text-muted shrink-0">
                  <span>{l.email || 'no email yet'}</span>
                  <span>{l.has_site ? 'mockup ready' : 'no mockup'}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Shell>
  )
}

function DiscoveryPanel({ config, job, onJob, onImported }: {
  config: AppConfig | null
  job: DiscoveryJob | null
  onJob: (j: DiscoveryJob) => void
  onImported: () => void
}) {
  const [source, setSource] = useState<'apify' | 'sweep' | 'companies_house'>('apify')
  const [mode, setMode] = useState<'no_website' | 'old_website'>('no_website')
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState('')
  const [sic, setSic] = useState('')
  const [daysBack, setDaysBack] = useState(30)
  const [max, setMax] = useState(30)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const j = source === 'sweep'
        ? await api.sweep({
            categories: categories.split(',').map((c) => c.trim()).filter(Boolean),
            max_per_search: Math.min(max, 25),
          })
        : await api.discover({
            source,
            query,
            mode,
            sic_code: sic,
            days_back: daysBack,
            max_results: max,
          })
      onJob(j)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const importCsv = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const j = await api.importLeadsCsv(file)
      onJob(j)
      onImported()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const sourceReady = source === 'companies_house'
    ? config?.companies_house_enabled
    : config?.apify_enabled
  const keyName = source === 'companies_house' ? 'COMPANIES_HOUSE_KEY' : 'APIFY_TOKEN'

  return (
    <div className="glass-card p-6 mb-8">
      <h2 className="font-display font-semibold text-lg mb-4">Find businesses without websites</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Source</label>
          <select className="input-field !py-2 text-sm !w-auto" value={source}
            onChange={(e) => setSource(e.target.value as 'apify' | 'sweep' | 'companies_house')}>
            <option value="apify">Google Maps (via Apify)</option>
            <option value="sweep">South West sweep (dated sites, services only)</option>
            <option value="companies_house">Companies House (new companies)</option>
          </select>
        </div>
        {source === 'apify' ? (
          <>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Target</label>
              <select className="input-field !py-2 text-sm !w-auto" value={mode}
                onChange={(e) => setMode(e.target.value as 'no_website' | 'old_website')}>
                <option value="no_website">No website at all</option>
                <option value="old_website">Dated website (modernise)</option>
              </select>
            </div>
            <div className="flex-1 min-w-56">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Search</label>
              <input className="input-field !py-2 text-sm" placeholder='e.g. "plumbers in Shrewsbury"'
                value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </>
        ) : source === 'sweep' ? (
          <div className="flex-1 min-w-56">
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Service categories (comma-separated, swept across 27 SW towns)
            </label>
            <input className="input-field !py-2 text-sm" placeholder='e.g. "plumbers, electricians"'
              value={categories} onChange={(e) => setCategories(e.target.value)} />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">SIC code</label>
              <input className="input-field !py-2 text-sm !w-32" placeholder="e.g. 43220"
                value={sic} onChange={(e) => setSic(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Incorporated within</label>
              <select className="input-field !py-2 text-sm !w-auto" value={daysBack}
                onChange={(e) => setDaysBack(Number(e.target.value))}>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Max results</label>
          <select className="input-field !py-2 text-sm !w-auto" value={max}
            onChange={(e) => setMax(Number(e.target.value))}>
            {[10, 30, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button className="btn-primary !py-2.5 text-sm" onClick={run}
          disabled={busy || !sourceReady || (
            source === 'apify' ? !query.trim()
            : source === 'sweep' ? !categories.trim()
            : !sic.trim())}>
          Run discovery
        </button>
        <button className="btn-ghost !py-2.5 text-sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
      </div>

      {!sourceReady && config && (
        <p className="text-text-muted text-xs mt-3">
          This source needs <code className="font-mono">{keyName}</code> in the Twin Native backend
          <code className="font-mono"> .env</code>. CSV import works without any keys.
        </p>
      )}
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      {job && (
        <p className={`text-sm mt-3 ${job.status === 'error' ? 'text-red-400' : 'text-text-secondary'}`}>
          {job.status === 'running' && <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-2" />}
          {job.kind === 'csv' ? 'CSV import' : job.label}:{' '}
          {job.status === 'running'
            ? 'searching… this can take a few minutes'
            : job.status === 'error'
              ? `failed — ${job.error}`
              : `${job.found} found, ${job.imported} new lead${job.imported === 1 ? '' : 's'} added, ${job.skipped} duplicates skipped`}
        </p>
      )}
    </div>
  )
}

function SettingsPanel() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => { api.leadSettings().then(setSettings).catch(() => {}) }, [])

  const save = async () => {
    if (!settings) return
    await api.saveLeadSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const FIELDS: [string, string][] = [
    ['pricing_build_fee', 'Build fee (shown on the prospect site)'],
    ['pricing_monthly_fee', 'Monthly fee (hosting + SEO)'],
    ['sender_name', 'Studio name (email header)'],
    ['sender_signoff', 'Email sign-off'],
  ]

  if (!settings) return null
  return (
    <div className="glass-card p-6 mb-8">
      <h2 className="font-display font-semibold text-lg mb-4">Pricing & sender</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
            <input className="input-field !py-2 text-sm" value={settings[key] ?? ''}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
          </div>
        ))}
      </div>
      <button className="btn-primary !py-2 text-sm mt-4" onClick={save}>
        {saved ? 'Saved' : 'Save settings'}
      </button>
    </div>
  )
}
