import { useEffect, useState } from 'react'
import Shell from '../components/Shell'
import { api, API_BASE } from '../api'

type DocId = 'proposal' | 'welcome'

const DOCS: { id: DocId; title: string; desc: string; url: string }[] = [
  {
    id: 'proposal',
    title: 'Follow-up pack — further info & SEO + ASO report example',
    desc: 'Sent when a prospect shows interest. Their site preview, the £695 / £59 pricing explained, the sample weekly SEO + ASO report (Google visibility plus AI-agent visibility), payment steps and FAQ. Every prospect gets this at their own private /proposal/ link.',
    url: `${API_BASE}/documents/proposal`,
  },
  {
    id: 'welcome',
    title: 'Welcome pack — sent after payment',
    desc: 'Fires automatically when the launch payment clears. Confirms payment, asks for their domain name choice (first year included), and walks through the go-live timeline and their first Monday SEO + ASO report.',
    url: `${API_BASE}/documents/welcome`,
  },
]

export default function Documents() {
  const [active, setActive] = useState<DocId>('proposal')
  const [followup, setFollowup] = useState<{ subject: string; body_text: string } | null>(null)
  const [showFollowup, setShowFollowup] = useState(false)

  useEffect(() => {
    api.followupTemplate({}).then(setFollowup).catch(() => {})
  }, [])

  const doc = DOCS.find((d) => d.id === active)!

  return (
    <Shell wide>
      <div className="mb-8">
        <p className="text-accent-secondary font-mono text-xs tracking-[0.25em] uppercase mb-2">Lead engine</p>
        <h1 className="font-display font-bold text-3xl md:text-4xl mb-1">Documents</h1>
        <p className="text-text-muted">
          The client-facing packs, rendered with sample data (Harper &amp; Sons Roofing). Prospects always
          see these personalised at their own private links.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-6">
        {DOCS.map((d) => (
          <button key={d.id} onClick={() => setActive(d.id)}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              active === d.id
                ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                : 'border-border text-text-muted hover:text-text-primary'
            }`}>
            {d.id === 'proposal' ? 'Follow-up pack' : 'Welcome pack'}
          </button>
        ))}
        <button onClick={() => setShowFollowup((s) => !s)}
          className={`px-4 py-2 rounded-full text-sm border transition-colors ${
            showFollowup
              ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
              : 'border-border text-text-muted hover:text-text-primary'
          }`}>
          {showFollowup ? 'Hide' : 'Show'} canned follow-up email
        </button>
      </div>

      {showFollowup && followup && (
        <div className="glass-card p-6 mb-6">
          <p className="font-display font-semibold mb-1">Package follow-up email (inserted from the Mailbox)</p>
          <p className="text-text-muted text-sm mb-4">
            The non-personalised reply for interested prospects — one click in any Mailbox thread inserts it
            with that lead&rsquo;s proposal link and login filled in.
          </p>
          <p className="text-sm font-semibold mb-2">Subject: {followup.subject}</p>
          <pre className="text-sm text-text-muted whitespace-pre-wrap leading-relaxed font-sans bg-background-elevated border border-border rounded-xl p-4 max-h-80 overflow-y-auto">
            {followup.body_text}
          </pre>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="font-display font-semibold">{doc.title}</p>
            <p className="text-text-muted text-sm mt-1 max-w-3xl">{doc.desc}</p>
          </div>
          <a href={doc.url} target="_blank" rel="noreferrer" className="btn-ghost !py-2 text-sm shrink-0">
            Open full size ↗
          </a>
        </div>
        <iframe
          key={doc.id}
          src={doc.url}
          title={doc.title}
          className="w-full bg-[#0b0a09]"
          style={{ height: '75vh', border: 'none' }}
        />
      </div>
    </Shell>
  )
}
