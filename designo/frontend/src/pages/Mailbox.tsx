import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../api'
import { MailboxSettings, MailboxStatus, MailMessage, MailThread, Lead } from '../types'

function timeAgo(ts: number): string {
  const s = Math.max(0, Date.now() / 1000 - ts)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`
  return new Date(ts * 1000).toLocaleDateString()
}

export default function Mailbox() {
  const [status, setStatus] = useState<MailboxStatus | null>(null)
  const [threads, setThreads] = useState<MailThread[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  const refresh = useCallback(() => {
    api.mailboxStatus().then(setStatus).catch(() => {})
    api.mailboxThreads().then(setThreads).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30000)
    return () => clearInterval(t)
  }, [refresh])

  const pollNow = async () => {
    setPolling(true)
    setError(null)
    try {
      await api.mailboxPoll()
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPolling(false)
    }
  }

  const needsSetup = status !== null && !status.imap_configured

  return (
    <Shell wide>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-accent-secondary font-mono text-xs tracking-[0.25em] uppercase mb-2">Lead engine</p>
          <h1 className="font-display font-bold text-3xl md:text-4xl mb-1">Mailbox</h1>
          <p className="text-text-muted">
            Pitch emails you approve land in Sent. Replies arrive here — answer in your own words or insert the package follow-up.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status?.imap_configured && (
            <button className="btn-ghost !py-2 text-sm" onClick={pollNow} disabled={polling}>
              {polling ? 'Checking…' : 'Check for new mail'}
            </button>
          )}
          <button className="btn-ghost !py-2 text-sm" onClick={() => setShowSettings((s) => !s)}>
            {showSettings ? 'Hide settings' : 'Mailbox settings'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
      )}
      {status?.last_error && (
        <p className="mb-6 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          Last mail check failed: {status.last_error}
        </p>
      )}

      {(showSettings || needsSetup) && <SettingsPanel onSaved={() => { setShowSettings(false); refresh() }} />}

      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        <ThreadList threads={threads} selected={selected} onSelect={setSelected} />
        {selected ? (
          <ThreadView counterpart={selected} onSent={refresh} />
        ) : (
          <div className="glass-card p-16 text-center hidden lg:block">
            <p className="font-display text-xl mb-2">Select a conversation</p>
            <p className="text-text-muted">
              {status?.imap_configured
                ? 'Replies from prospects appear on the left as they arrive (checked every 2 minutes).'
                : 'Connect your email account in Mailbox settings to receive replies here.'}
            </p>
          </div>
        )}
      </div>
    </Shell>
  )
}

function ThreadList({ threads, selected, onSelect }: {
  threads: MailThread[] | null
  selected: string | null
  onSelect: (c: string) => void
}) {
  if (threads === null) return <p className="text-text-muted">Loading…</p>
  if (threads.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <p className="font-display text-lg mb-2">No conversations yet</p>
        <p className="text-text-muted text-sm">
          When you approve and send a pitch from a lead page it appears here, along with any reply.
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {threads.map((t) => (
        <button key={t.counterpart} onClick={() => onSelect(t.counterpart)}
          className={`glass-card w-full text-left px-4 py-3.5 block transition-colors duration-200 ${
            selected === t.counterpart ? 'border-accent-primary/60' : 'hover:border-accent-primary/40'
          }`}>
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold truncate flex-1">
              {t.business_name || t.counterpart}
            </span>
            {t.unread > 0 && (
              <span className="bg-accent-primary text-white text-[11px] font-semibold rounded-full px-2 py-0.5 shrink-0">
                {t.unread}
              </span>
            )}
            <span className="text-text-muted text-xs shrink-0">{timeAgo(t.created_at)}</span>
          </div>
          <p className="text-text-muted text-sm truncate mt-0.5">
            <span className={t.direction === 'in' ? 'text-accent-secondary' : ''}>
              {t.direction === 'in' ? '← ' : '→ '}
            </span>
            {t.subject || '(no subject)'}
          </p>
          {t.business_name && (
            <p className="text-text-muted text-xs truncate mt-0.5">{t.counterpart}</p>
          )}
        </button>
      ))}
    </div>
  )
}

function ThreadView({ counterpart, onSent }: { counterpart: string; onSent: () => void }) {
  const [messages, setMessages] = useState<MailMessage[] | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentFlash, setSentFlash] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages(null)
    setLead(null)
    setBody('')
    setError(null)
    api.mailboxThread(counterpart).then((t) => {
      setMessages(t.messages)
      setLead(t.lead)
      const last = t.messages[t.messages.length - 1]
      if (last) {
        setSubject(last.subject.startsWith('Re:') ? last.subject : `Re: ${last.subject}`)
      }
    }).catch((e) => setError(e.message))
  }, [counterpart])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  const insertFollowup = async () => {
    setError(null)
    try {
      const t = await api.followupTemplate({ lead_id: lead?.id, counterpart })
      setSubject(t.subject)
      setBody(t.body_text)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      const sent = await api.mailboxReply({ counterpart, subject, body_text: body, lead_id: lead?.id ?? null })
      setMessages((m) => (m ? [...m, sent] : [sent]))
      setBody('')
      setSentFlash(true)
      setTimeout(() => setSentFlash(false), 2500)
      onSent()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-card px-5 py-4 flex items-center gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold truncate">
            {lead?.business_name || counterpart}
          </p>
          <p className="text-text-muted text-sm truncate">{counterpart}</p>
        </div>
        {lead && (
          <Link to={`/leads/${lead.id}`} className="btn-ghost !py-2 text-sm shrink-0">
            Open lead →
          </Link>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
      )}

      {messages === null ? (
        <p className="text-text-muted">Loading…</p>
      ) : (
        <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
          {messages.map((m) => (
            <div key={m.id}
              className={`glass-card px-5 py-4 ${m.direction === 'out' ? 'ml-8 border-accent-primary/30' : 'mr-8'}`}>
              <div className="flex items-center gap-3 mb-2 text-xs text-text-muted">
                <span className={`font-semibold ${m.direction === 'out' ? 'text-accent-primary' : 'text-accent-secondary'}`}>
                  {m.direction === 'out' ? 'You' : (lead?.business_name || counterpart)}
                </span>
                <span>{new Date(m.created_at * 1000).toLocaleString()}</span>
              </div>
              <p className="text-sm font-semibold mb-2">{m.subject || '(no subject)'}</p>
              <div className="text-sm text-text-muted whitespace-pre-wrap leading-relaxed">
                {m.body_text || '(no text content)'}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <p className="font-display font-semibold">Reply</p>
          <button className="btn-ghost !py-1.5 text-sm !border-amber-500/40 text-amber-400" onClick={insertFollowup}>
            Insert package follow-up
          </button>
        </div>
        <input
          className="input-field w-full mb-3 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
        />
        <textarea
          className="input-field w-full text-sm min-h-[160px] leading-relaxed"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your reply, or insert the package follow-up above…"
        />
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <p className="text-text-muted text-xs">
            Sent from your outreach address via Resend, threaded onto this conversation.
          </p>
          <div className="flex items-center gap-3">
            {sentFlash && <span className="text-emerald-400 text-sm">Sent ✓</span>}
            <button className="btn-primary !py-2 text-sm" onClick={send}
              disabled={busy || !body.trim() || !subject.trim()}>
              {busy ? 'Sending…' : 'Send reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsPanel({ onSaved }: { onSaved: () => void }) {
  const [settings, setSettings] = useState<MailboxSettings | null>(null)
  const [host, setHost] = useState('')
  const [port, setPort] = useState('993')
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.mailboxSettings().then((s) => {
      setSettings(s)
      setHost(s.imap_host)
      setPort(s.imap_port)
      setUser(s.imap_user)
    }).catch(() => {})
  }, [])

  const save = async () => {
    setBusy(true)
    setError(null)
    setTestResult(null)
    try {
      const body: Record<string, string> = { imap_host: host.trim(), imap_port: port.trim(), imap_user: user.trim() }
      if (password) body.imap_password = password
      await api.saveMailboxSettings(body)
      const result = await api.mailboxTest()
      setTestResult(result)
      if (result.ok) onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass-card p-6 mb-8">
      <p className="font-display font-semibold mb-1">Connect your Twin Native email</p>
      <p className="text-text-muted text-sm mb-5">
        IMAP details for the mailbox that receives replies (the reply-to address on your pitch emails).
        For Gmail use an app password; for most providers the host is imap.yourprovider.com, port 993.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className="text-text-muted text-xs uppercase tracking-wider block mb-1.5">IMAP host</span>
          <input className="input-field w-full text-sm" value={host} onChange={(e) => setHost(e.target.value)}
            placeholder="imap.zoho.eu" />
        </label>
        <label className="block">
          <span className="text-text-muted text-xs uppercase tracking-wider block mb-1.5">Port</span>
          <input className="input-field w-full text-sm" value={port} onChange={(e) => setPort(e.target.value)}
            placeholder="993" />
        </label>
        <label className="block">
          <span className="text-text-muted text-xs uppercase tracking-wider block mb-1.5">Username / email</span>
          <input className="input-field w-full text-sm" value={user} onChange={(e) => setUser(e.target.value)}
            placeholder="hello@yourdomain.co.uk" autoComplete="off" />
        </label>
        <label className="block">
          <span className="text-text-muted text-xs uppercase tracking-wider block mb-1.5">
            Password {settings?.imap_password_set ? '(saved — leave blank to keep)' : ''}
          </span>
          <input className="input-field w-full text-sm" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={settings?.imap_password_set ? '••••••••' : 'app password'} autoComplete="new-password" />
        </label>
      </div>
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      {testResult && (
        <p className={`text-sm mb-3 ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {testResult.ok ? '✓ ' : '✗ '}{testResult.detail}
        </p>
      )}
      <button className="btn-primary !py-2 text-sm" onClick={save} disabled={busy || !host || !user}>
        {busy ? 'Saving & testing…' : 'Save & test connection'}
      </button>
    </div>
  )
}
