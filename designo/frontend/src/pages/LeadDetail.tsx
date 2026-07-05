import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../api'
import { AppConfig, Lead, LeadEvent, LEAD_TRANSIENT } from '../types'
import { LeadBadge } from './Leads'

const EVENT_LABELS: Record<string, string> = {
  discovered: 'Lead discovered',
  brief_written: 'Brief written by Fable',
  mockup_ready: 'Mockup website built',
  preview_media_failed: 'Preview media capture failed',
  access_created: 'Login credentials created',
  email_drafted: 'Pitch email drafted',
  approved: 'Email approved',
  email_sent: 'Email sent',
  email_delivered: 'Email delivered',
  email_opened: 'Email opened',
  email_image_loaded: 'Email preview image loaded',
  email_bounced: 'Email bounced',
  email_complained: 'Marked as spam',
  unsubscribed: 'Unsubscribed',
  login: 'Logged into their site',
  login_failed: 'Failed login attempt',
  page_view: 'Viewed their site',
  scroll: 'Scrolled the site',
  time_on_page: 'Time on site',
  pricing_viewed: 'Saw the pricing panel',
  pricing_dismissed: 'Dismissed the pricing panel',
  pricing_cta: 'Clicked "reply by email"',
  proposal_viewed: 'Viewed the proposal page',
  checkout_initiated: 'Started checkout',
  payment_received: 'Payment received (£695)',
  subscription_created: 'Monthly subscription set up',
  invoice_payment_failed: 'Payment failed',
  subscription_cancelled: 'Subscription cancelled',
  welcome_sent: 'Welcome pack sent',
  welcome_send_failed: 'Welcome pack failed to send',
  welcome_viewed: 'Viewed their welcome page',
  email_reply_received: 'Replied — see Mailbox',
  reply_sent: 'You replied',
}

function eventLabel(e: LeadEvent): string {
  const base = EVENT_LABELS[e.kind] ?? e.kind
  if (e.kind === 'scroll' && e.data.depth) return `Scrolled to ${e.data.depth}%`
  if (e.kind === 'time_on_page' && e.data.seconds) return `Spent ${e.data.seconds}s on the site`
  return base
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState<Lead | null>(null)
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [emailDirty, setEmailDirty] = useState(false)
  const [showHtml, setShowHtml] = useState(false)
  const [editEmail, setEditEmail] = useState('')
  const [confirmSend, setConfirmSend] = useState(false)

  const refresh = useCallback(() => {
    if (!id) return
    api.getLead(id).then((l) => {
      setLead(l)
      setEditEmail((prev) => prev || l.email)
      if (l.outreach_email && !emailDirty) {
        setSubject(l.outreach_email.subject)
        setBodyText(l.outreach_email.body_text)
      }
    }).catch((e) => setError(e.message))
  }, [id, emailDirty])

  useEffect(() => {
    refresh()
    api.config().then(setConfig).catch(() => {})
  }, [refresh])

  const transient = lead ? LEAD_TRANSIENT.includes(lead.status) : false
  useEffect(() => {
    if (!transient) return
    const t = setInterval(refresh, 3500)
    return () => clearInterval(t)
  }, [transient, refresh])

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const runPipeline = () => act(() => api.runLead(lead!.id))

  const saveEmailDraft = () => act(async () => {
    await api.updateLeadEmail(lead!.id, { subject, body_text: bodyText })
    setEmailDirty(false)
  })

  const approveAndSend = () => {
    setConfirmSend(false)
    act(async () => {
      if (emailDirty) await api.updateLeadEmail(lead!.id, { subject, body_text: bodyText })
      setEmailDirty(false)
      await api.approveLead(lead!.id)
    })
  }

  const saveContactEmail = () => act(() => api.updateLead(lead!.id, { email: editEmail }))

  const setStatus = (status: string) => act(() => api.updateLead(lead!.id, { status }))

  const sendWelcome = () => {
    if (!window.confirm('Send the welcome pack email to this lead now?')) return
    act(() => api.sendWelcome(lead!.id))
  }

  const remove = async () => {
    if (!lead) return
    if (!window.confirm(`Delete lead "${lead.business_name}" plus its mockup site and all tracking data?`)) return
    await api.deleteLead(lead.id)
    navigate('/leads')
  }

  if (!lead) {
    return <Shell><p className="text-text-muted">{error ?? 'Loading…'}</p></Shell>
  }

  const canRun = ['new', 'error', 'review'].includes(lead.status)
  const inReview = lead.status === 'review'
  const prospectUrl = lead.access && config ? `${config.public_url}/p/${lead.access.slug}/` : null
  const mediaVersion = Math.round(lead.updated_at)

  return (
    <Shell wide>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div className="min-w-0">
          <p className="text-accent-secondary font-mono text-xs tracking-[0.25em] uppercase mb-2">
            <Link to="/leads" className="hover:text-accent-glow">Leads</Link> / {lead.source}
          </p>
          <h1 className="font-display font-bold text-3xl md:text-4xl mb-2 truncate">{lead.business_name}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <LeadBadge status={lead.status} />
            {lead.status_detail && (
              <span className={`text-sm ${lead.status === 'error' ? 'text-red-400' : 'text-text-muted'}`}>
                {lead.status_detail}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['sent', 'opened', 'logged_in'].includes(lead.status) && (
            <>
              <button className="btn-ghost !py-2 text-sm !border-emerald-500/40" onClick={() => setStatus('won')} disabled={busy}>
                Mark won
              </button>
              <button className="btn-ghost !py-2 text-sm !border-red-500/40" onClick={() => setStatus('lost')} disabled={busy}>
                Mark lost
              </button>
            </>
          )}
          {lead.project_id && lead.has_site && (
            <a href={api.previewUrl(lead.project_id)} target="_blank" rel="noreferrer" className="btn-ghost !py-2 text-sm">
              Open mockup
            </a>
          )}
          {lead.access?.slug && ['sent', 'opened', 'logged_in', 'won'].includes(lead.status) && (
            <a
              href={`${config?.public_url ?? ''}/p/${lead.access.slug}/proposal/`}
              target="_blank" rel="noreferrer"
              className="btn-ghost !py-2 text-sm !border-amber-500/40 text-amber-400"
            >
              View proposal page ↗
            </a>
          )}
          {lead.status === 'won' && (
            <>
              <a href={api.welcomePreviewUrl(lead.id)} target="_blank" rel="noreferrer"
                className="btn-ghost !py-2 text-sm">
                Preview welcome pack
              </a>
              <button className="btn-ghost !py-2 text-sm !border-emerald-500/40 text-emerald-400"
                onClick={sendWelcome} disabled={busy}>
                {(lead.events ?? []).some((e) => e.kind === 'welcome_sent') ? 'Re-send welcome pack' : 'Send welcome pack'}
              </button>
            </>
          )}
          <button onClick={remove} className="btn-ghost !py-2 text-sm !border-red-500/40 text-red-400" disabled={busy}>
            Delete
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        {/* Left: mockup preview */}
        <div className="space-y-6">
          <div className="glass-card overflow-hidden min-h-[60vh] flex flex-col">
            {transient ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary shadow-glow animate-float mb-6" />
                <p className="font-display text-xl mb-2">{lead.status_detail ?? 'Working…'}</p>
                <p className="text-text-muted text-sm max-w-md">
                  Fable researches the business, writes the brief, builds the full motion mockup with AI artwork,
                  captures the email preview, and drafts the pitch — typically 5–12 minutes.
                </p>
              </div>
            ) : lead.project_id && lead.has_site ? (
              <iframe src={api.previewUrl(lead.project_id)} title="Mockup preview"
                className="flex-1 w-full bg-white" sandbox="allow-scripts allow-same-origin" />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <p className="font-display text-xl mb-2">No mockup yet</p>
                <p className="text-text-muted text-sm mb-6 max-w-md">
                  Run the pipeline: Fable writes the brief, builds a full motion website with AI-generated artwork,
                  and drafts the pitch email — then waits for your approval.
                </p>
                <button className="btn-primary" onClick={runPipeline} disabled={busy || !canRun}>
                  Run pipeline
                </button>
              </div>
            )}
          </div>

          {lead.preview_media?.gif && (
            <div className="glass-card p-6">
              <h2 className="font-display font-semibold text-lg mb-1">Email preview media</h2>
              <p className="text-text-muted text-sm mb-4">This animated scroll-through is embedded inside the pitch email.</p>
              <img src={api.leadMediaUrl(lead.id, 'scroll.gif', mediaVersion)} alt="Animated preview of the mockup site"
                className="w-full max-w-xl rounded-xl border border-border" />
            </div>
          )}
        </div>

        {/* Right: pipeline, contact, access, email, activity */}
        <div className="space-y-6">
          {(canRun || lead.status === 'error') && lead.has_site && (
            <div className="glass-card p-6">
              <h2 className="font-display font-semibold text-lg mb-1">Pipeline</h2>
              <p className="text-text-muted text-sm mb-3">
                {lead.status === 'error'
                  ? 'The last run failed — retrying picks up from where it got to (existing brief and mockup are reused).'
                  : 'Re-running reuses the existing brief and mockup and redrafts the email.'}
              </p>
              <button className="btn-primary w-full !py-2.5 text-sm" onClick={runPipeline} disabled={busy}>
                {lead.status === 'error' ? 'Retry pipeline' : 'Re-run drafting'}
              </button>
            </div>
          )}

          <div className="glass-card p-6">
            <h2 className="font-display font-semibold text-lg mb-3">Business</h2>
            <dl className="space-y-2 text-sm">
              {[['Category', lead.category], ['Town', lead.town], ['Address', lead.address],
                ['Phone', lead.phone],
                ['Rating', lead.rating ? `★ ${lead.rating} (${lead.reviews_count ?? 0} reviews)` : ''],
                ['Description', lead.description]].map(([k, v]) => v ? (
                  <div key={k} className="flex gap-3">
                    <dt className="text-text-muted w-24 shrink-0">{k}</dt>
                    <dd className="text-text-secondary min-w-0">{v}</dd>
                  </div>
                ) : null)}
            </dl>
            <div className="mt-4">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Prospect email address</label>
              <div className="flex gap-2">
                <input className="input-field !py-2 text-sm flex-1" placeholder="Needed before sending"
                  value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                <button className="btn-ghost !py-2 text-sm" onClick={saveContactEmail}
                  disabled={busy || editEmail.trim().toLowerCase() === lead.email}>
                  Save
                </button>
              </div>
              {!lead.email && (
                <p className="text-amber-300/80 text-xs mt-2">
                  No email was found for this business — add one manually (check their Facebook page or listing).
                </p>
              )}
            </div>
          </div>

          {lead.access && prospectUrl && (
            <div className="glass-card p-6">
              <h2 className="font-display font-semibold text-lg mb-3">Prospect login</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-3">
                  <dt className="text-text-muted w-24 shrink-0">Site</dt>
                  <dd className="min-w-0 truncate">
                    <a href={prospectUrl} target="_blank" rel="noreferrer"
                      className="text-accent-primary hover:text-accent-glow break-all">{prospectUrl}</a>
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-text-muted w-24 shrink-0">Username</dt>
                  <dd className="font-mono text-text-secondary">{lead.access.username}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-text-muted w-24 shrink-0">Password</dt>
                  <dd className="font-mono text-text-secondary">{lead.access.password}</dd>
                </div>
              </dl>
              <p className="text-text-muted text-xs mt-3">These are included in the pitch email automatically.</p>
            </div>
          )}

          {lead.outreach_email && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-lg">Pitch email</h2>
                <button className="text-xs text-accent-primary hover:text-accent-glow"
                  onClick={() => setShowHtml((s) => !s)}>
                  {showHtml ? 'Edit text' : 'Preview email'}
                </button>
              </div>

              {lead.outreach_email.status === 'sent' ? (
                <>
                  <p className="text-sm text-text-secondary mb-1">Sent {lead.outreach_email.sent_at
                    ? new Date(lead.outreach_email.sent_at * 1000).toLocaleString() : ''} to {lead.email}</p>
                  <p className="text-sm text-text-muted mb-3">"{lead.outreach_email.subject}"</p>
                  <iframe src={api.leadEmailPreviewUrl(lead.id, mediaVersion)} title="Sent email"
                    className="w-full h-96 bg-white rounded-xl border border-border" sandbox="" />
                </>
              ) : showHtml ? (
                <iframe src={api.leadEmailPreviewUrl(lead.id, mediaVersion)} title="Email preview"
                  className="w-full h-[480px] bg-white rounded-xl border border-border" sandbox="" />
              ) : (
                <>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Subject</label>
                  <input className="input-field !py-2 text-sm mb-3" value={subject}
                    onChange={(e) => { setSubject(e.target.value); setEmailDirty(true) }} />
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Body (the preview image, login box and button are added around this)
                  </label>
                  <textarea className="input-field min-h-44 text-sm mb-3" value={bodyText}
                    onChange={(e) => { setBodyText(e.target.value); setEmailDirty(true) }} />
                  <div className="flex gap-2">
                    {emailDirty && (
                      <button className="btn-ghost !py-2 text-sm" onClick={saveEmailDraft} disabled={busy}>
                        Save draft
                      </button>
                    )}
                  </div>
                </>
              )}

              {inReview && lead.outreach_email.status !== 'sent' && (
                <div className="mt-4 pt-4 border-t border-border">
                  {!config?.outreach_enabled ? (
                    <p className="text-text-muted text-sm">
                      Sending needs <code className="font-mono text-xs">RESEND_API_KEY</code> and
                      <code className="font-mono text-xs"> DESIGNO_OUTREACH_FROM</code> in the backend .env.
                    </p>
                  ) : !lead.email ? (
                    <p className="text-amber-300/80 text-sm">Add the prospect's email address above before sending.</p>
                  ) : confirmSend ? (
                    <div className="flex items-center gap-2">
                      <button className="btn-primary flex-1 !py-2.5 text-sm" onClick={approveAndSend} disabled={busy}>
                        Yes — send to {lead.email}
                      </button>
                      <button className="btn-ghost !py-2.5 text-sm" onClick={() => setConfirmSend(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="btn-primary w-full !py-2.5 text-sm" onClick={() => setConfirmSend(true)} disabled={busy}>
                      Approve & send
                    </button>
                  )}
                </div>
              )}
              {lead.outreach_email.status === 'error' && (
                <p className="text-red-400 text-sm mt-3">{lead.outreach_email.error}</p>
              )}
            </div>
          )}

          {lead.events && lead.events.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="font-display font-semibold text-lg mb-4">Activity</h2>
              <ol className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {lead.events.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      ['login', 'pricing_cta', 'email_opened'].includes(e.kind) ? 'bg-emerald-400'
                        : ['email_bounced', 'email_complained', 'login_failed', 'unsubscribed', 'preview_media_failed'].includes(e.kind)
                          ? 'bg-red-400' : 'bg-accent-primary/70'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-text-secondary">{eventLabel(e)}</p>
                      <p className="text-text-muted text-xs">{new Date(e.created_at * 1000).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
