import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../api'
import { AppConfig, Project } from '../types'

const GENERATING_LINES = [
  'Reading the brief…',
  'Casting your photos into scenes…',
  'Choreographing scroll pacing…',
  'Layering film grain and vignette…',
  'Tinting each act of the story…',
  'Polishing glass cards…',
  'Writing premium copy…',
  'Final render…',
]

export default function Studio() {
  const { id } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [instruction, setInstruction] = useState('')
  const [busy, setBusy] = useState(false)
  const [lineIdx, setLineIdx] = useState(0)

  const refresh = useCallback(() => {
    if (!id) return
    api.getProject(id).then(setProject).catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    refresh()
    api.config().then(setConfig).catch(() => {})
  }, [refresh])

  // Poll while anything is in flight
  const generating = project?.status === 'generating'
  const videoPending = project?.videos.some((v) => v.status === 'pending' || v.status === 'generating') ?? false
  useEffect(() => {
    if (!generating && !videoPending) return
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [generating, videoPending, refresh])

  useEffect(() => {
    if (!generating) return
    const t = setInterval(() => setLineIdx((i) => (i + 1) % GENERATING_LINES.length), 3500)
    return () => clearInterval(t)
  }, [generating])

  const iterate = async () => {
    if (!id || !instruction.trim()) return
    setBusy(true)
    setError(null)
    try {
      await api.iterate(id, instruction.trim())
      setInstruction('')
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const regenerate = async () => {
    if (!id) return
    setBusy(true)
    setError(null)
    try {
      await api.generate(id)
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!project) {
    return <Shell><p className="text-text-muted">{error ?? 'Loading…'}</p></Shell>
  }

  const previewSrc = `${api.previewUrl(project.id)}?v=${project.site_generated_at ?? 0}`

  return (
    <Shell wide>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-accent-secondary font-mono text-xs tracking-[0.25em] uppercase mb-2">Studio</p>
          <h1 className="font-display font-bold text-3xl md:text-4xl mb-1">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/project/${project.id}/brief`} className="btn-ghost !py-2 text-sm">Edit brief</Link>
          <Link to={`/project/${project.id}/photos`} className="btn-ghost !py-2 text-sm">Photos</Link>
          {project.has_site && (
            <>
              <a href={previewSrc} target="_blank" rel="noreferrer" className="btn-ghost !py-2 text-sm">Open full screen</a>
              <a href={api.exportUrl(project.id)} className="btn-primary !py-2 text-sm">Download site</a>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* Preview */}
        <div className="glass-card overflow-hidden min-h-[70vh] flex flex-col">
          {generating ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary shadow-glow animate-float flex items-center justify-center mb-8">
                <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              {project.phase && (
                <p className="text-accent-secondary font-mono text-xs tracking-[0.2em] uppercase mb-3">
                  {project.phase}
                </p>
              )}
              <motion.p key={lineIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="font-display text-xl mb-2">
                {GENERATING_LINES[lineIdx]}
              </motion.p>
              <p className="text-text-muted text-sm">
                The creative director studies your industry, commissions artwork, then builds the site — usually 3–6 minutes.
              </p>
            </div>
          ) : project.has_site ? (
            <iframe
              key={previewSrc}
              src={previewSrc}
              title="Generated website preview"
              className="flex-1 w-full bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : project.status === 'error' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <p className="font-display text-xl mb-2 text-red-400">Generation failed</p>
              <p className="text-text-muted text-sm max-w-md mb-6">{project.error}</p>
              <button className="btn-primary" onClick={regenerate} disabled={busy}>Try again</button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <p className="font-display text-xl mb-2">No site yet</p>
              <p className="text-text-muted text-sm mb-6">Generate a website from your brief and photos.</p>
              <button className="btn-primary" onClick={regenerate} disabled={busy || project.photos.length === 0}>
                Generate website
              </button>
              {project.photos.length === 0 && (
                <p className="text-text-muted text-xs mt-3">Upload at least one photo first.</p>
              )}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          {/* Iterate */}
          <div className="glass-card p-6">
            <h2 className="font-display font-semibold text-lg mb-1">Refine it</h2>
            <p className="text-text-muted text-sm mb-4">
              Keep iterating like a design chat — the whole site is rebuilt with your note applied.
            </p>
            <textarea
              className="input-field min-h-24 text-sm mb-3"
              placeholder='e.g. "Make the hero darker and moodier" or "Swap the gallery to a horizontal scroll"'
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={generating}
            />
            <div className="flex gap-2">
              <button className="btn-primary flex-1 !py-2.5 text-sm" onClick={iterate}
                disabled={generating || busy || !instruction.trim() || !project.has_site}>
                Apply changes
              </button>
              <button className="btn-ghost !py-2.5 text-sm" onClick={regenerate}
                disabled={generating || busy} title="Rebuild from scratch">
                Regenerate
              </button>
            </div>
          </div>

          {/* Machine-readable shadow site */}
          {project.has_shadow && (
            <div className="glass-card p-6">
              <h2 className="font-display font-semibold text-lg mb-1">Shadow site</h2>
              <p className="text-text-muted text-sm mb-3">
                A machine-readable layer ships with every site so AI agents can read
                and transact with the business — plus schema.org data for SEO.
              </p>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                {(['agent.html', 'agent.json', 'llms.txt'] as const).map((f) => (
                  <a key={f} href={`${api.previewUrl(project.id)}${f}`} target="_blank" rel="noreferrer"
                    className="font-mono text-xs px-2.5 py-1.5 rounded-lg border border-border text-accent-primary hover:text-accent-glow hover:border-accent-primary/50 transition-colors">
                    {f}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI hero video */}
          <HeroVideoPanel project={project} config={config} onStarted={refresh} generating={generating} />
        </div>
      </div>
    </Shell>
  )
}

function StatusBadge({ status }: { status: Project['status'] }) {
  const map: Record<Project['status'], { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    generating: { label: 'Generating…', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    ready: { label: 'Ready', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    error: { label: 'Error', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  }
  const badge = map[status]
  return <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border ${badge.cls}`}>{badge.label}</span>
}

function HeroVideoPanel({ project, config, onStarted, generating }: {
  project: Project
  config: AppConfig | null
  onStarted: () => void
  generating: boolean
}) {
  const [photoId, setPhotoId] = useState('')
  const [tier, setTier] = useState<'draft' | 'final'>('draft')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const heroFirst = useRef(false)

  const durationS = 6
  const costEstimate = tier === 'draft' ? '~$0.27' : '~$0.50'

  useEffect(() => {
    if (heroFirst.current || project.photos.length === 0) return
    heroFirst.current = true
    const hero = project.photos.find((p) => p.tag === 'hero') ?? project.photos[0]
    setPhotoId(hero.id)
  }, [project.photos])

  const launch = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.heroVideo(project.id, photoId, tier, prompt, durationS)
      onStarted()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const addToSite = async (videoId: string) => {
    setAddingId(videoId)
    setError(null)
    try {
      await api.addVideoToSite(project.id, videoId)
      onStarted()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="glass-card p-6">
      <h2 className="font-display font-semibold text-lg mb-1">AI hero video</h2>
      {!config?.video_enabled ? (
        <p className="text-text-muted text-sm">
          Optional paid upgrade: animate a photo into a cinematic hero clip.
          Add a <code className="font-mono text-xs">FAL_KEY</code> to the Twin Native backend
          <code className="font-mono text-xs"> .env</code> to switch this on.
        </p>
      ) : (
        <>
          <p className="text-text-muted text-sm mb-4">
            Animate one of your photos into a {durationS}s cinematic loop, then regenerate the
            site to feature it in the hero.
          </p>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Source photo</label>
          <select className="input-field !py-2 text-sm mb-3" value={photoId} onChange={(e) => setPhotoId(e.target.value)}>
            {project.photos.map((p) => (
              <option key={p.id} value={p.id}>{p.original_name} ({p.tag})</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(['draft', 'final'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTier(t)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                  tier === t ? 'border-accent-primary bg-accent-primary/10' : 'border-border hover:border-accent-primary/50'
                }`}>
                <div className="font-medium capitalize text-sm">{t}</div>
                <div className="text-xs text-text-muted">{t === 'draft' ? 'Hailuo · cheap & fast' : 'Kling · best quality'}</div>
              </button>
            ))}
          </div>
          <input className="input-field !py-2 text-sm mb-3" placeholder="Motion prompt (optional)"
            value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <button className="btn-primary w-full !py-2.5 text-sm" onClick={launch}
            disabled={busy || !photoId || generating}>
            Generate clip · {costEstimate}
          </button>
        </>
      )}

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {project.videos.length > 0 && (
        <ul className="mt-4 space-y-2">
          {project.videos.map((v) => (
            <li key={v.id} className="text-sm border border-border rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-xs text-text-muted truncate">{v.filename}</span>
                <span className={`text-xs font-medium ${
                  v.status === 'ready' ? 'text-emerald-400'
                    : v.status === 'error' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {v.status}
                </span>
              </div>
              {v.status === 'ready' && (
                <>
                  <video src={api.videoUrl(project.id, v.id)} controls muted loop
                    className="w-full rounded-lg mt-1" />
                  <button
                    className="btn-primary w-full !py-2 text-sm mt-2"
                    onClick={() => addToSite(v.id)}
                    disabled={generating || addingId !== null}
                    title="Rebuild the site with this clip as the hero background video"
                  >
                    {addingId === v.id ? 'Adding to website…' : 'Add to website'}
                  </button>
                </>
              )}
              {v.status === 'error' && <p className="text-xs text-text-muted">{v.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
