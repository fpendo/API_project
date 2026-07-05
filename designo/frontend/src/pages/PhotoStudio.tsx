import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../api'
import { AppConfig, Photo, Project } from '../types'

const TAG_HINTS: Record<string, string> = {
  hero: 'Full-bleed opening shot',
  product: 'Showcased large',
  team: 'Portrait cards',
  gallery: 'Editorial grid',
  background: 'Section backdrop',
  texture: 'Atmospheric layer',
  logo: 'Brand mark',
  artwork: 'AI-commissioned piece',
}

export default function PhotoStudio() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [spliceOn, setSpliceOn] = useState(false)
  const [touchUpOn, setTouchUpOn] = useState(true)
  const [batchInstruction, setBatchInstruction] = useState('')
  const [batchBusy, setBatchBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([api.getProject(id), api.config()])
      .then(([p, c]) => { setProject(p); setConfig(c) })
      .catch((e) => setError(e.message))
  }, [id])

  const upload = useCallback(async (files: FileList | File[]) => {
    if (!id) return
    setError(null)
    const list = Array.from(files)
    setUploading((n) => n + list.length)
    for (const file of list) {
      try {
        // First photo defaults to hero so every project has an opening shot
        const isFirst = !uploadedRef.current && (projectRef.current?.photos.length ?? 0) === 0
        const photo = await api.uploadPhoto(id, file, isFirst ? 'hero' : 'gallery')
        uploadedRef.current = true
        setProject((p) => p ? { ...p, photos: [...p.photos, photo] } : p)
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`)
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }, [id])

  // refs so the sequential upload loop sees fresh state
  const projectRef = useRef<Project | null>(null)
  const uploadedRef = useRef(false)
  useEffect(() => { projectRef.current = project }, [project])

  // poll while any photo is being retouched
  const anyEditing = project?.photos.some((p) => p.edit_status === 'editing') ?? false
  useEffect(() => {
    if (!id || !anyEditing) return
    const t = setInterval(() => {
      api.getProject(id).then(setProject).catch(() => {})
    }, 4000)
    return () => clearInterval(t)
  }, [id, anyEditing])

  const retouch = async (photo: Photo, instruction: string) => {
    if (!id) return
    setError(null)
    try {
      const updated = await api.retouchPhoto(id, photo.id, instruction)
      setProject((p) => p ? { ...p, photos: p.photos.map((x) => x.id === photo.id ? updated : x) } : p)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const revert = async (photo: Photo) => {
    if (!id) return
    const updated = await api.revertPhoto(id, photo.id)
    setProject((p) => p ? { ...p, photos: p.photos.map((x) => x.id === photo.id ? updated : x) } : p)
  }

  const toggleSelect = (photoId: string) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  const applyBatch = async () => {
    if (!id || selected.size === 0) return
    setError(null)
    setBatchBusy(true)
    const ids = [...selected]
    try {
      if (spliceOn) {
        const placeholder = await api.splicePhotos(id, ids, batchInstruction, touchUpOn)
        setProject((p) => p ? { ...p, photos: [...p.photos, placeholder] } : p)
      } else if (touchUpOn) {
        for (const photoId of ids) {
          const photo = project?.photos.find((x) => x.id === photoId)
          if (!photo || photo.tag === 'artwork' || photo.edit_status === 'editing') continue
          const updated = await api.retouchPhoto(id, photoId, batchInstruction)
          setProject((p) => p ? { ...p, photos: p.photos.map((x) => x.id === photoId ? updated : x) } : p)
        }
      }
      setSelected(new Set())
      setBatchInstruction('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBatchBusy(false)
    }
  }

  const updatePhoto = async (photo: Photo, fields: { tag?: string; caption?: string }) => {
    if (!id) return
    const updated = await api.updatePhoto(id, photo.id, fields)
    setProject((p) => p ? { ...p, photos: p.photos.map((x) => x.id === photo.id ? updated : x) } : p)
  }

  const removePhoto = async (photo: Photo) => {
    if (!id) return
    await api.deletePhoto(id, photo.id)
    setProject((p) => p ? { ...p, photos: p.photos.filter((x) => x.id !== photo.id) } : p)
  }

  const generate = async () => {
    if (!id) return
    setStarting(true)
    setError(null)
    try {
      await api.generate(id)
      navigate(`/project/${id}/studio`)
    } catch (e) {
      setError((e as Error).message)
      setStarting(false)
    }
  }

  if (!project) {
    return <Shell><p className="text-text-muted">{error ?? 'Loading…'}</p></Shell>
  }

  const tags = config?.photo_tags ?? Object.keys(TAG_HINTS)

  return (
    <Shell wide>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="text-accent-secondary font-mono text-xs tracking-[0.25em] uppercase mb-2">Photo studio</p>
            <h1 className="font-display font-bold text-3xl md:text-4xl mb-1">{project.name}</h1>
            <p className="text-text-muted">
              Photos live in this project's own ringfenced storage. Tag each shot so the
              generator knows how to stage it.
            </p>
          </div>
          <Link to={`/project/${id}/brief`} className="btn-ghost !py-2 text-sm">Edit brief</Link>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files) }}
          onClick={() => fileInput.current?.click()}
          role="button"
          tabIndex={0}
          className={`glass-card p-12 text-center cursor-pointer transition-all duration-200 mb-8 ${
            dragging ? 'border-accent-primary shadow-glow' : 'hover:border-accent-primary/50'
          }`}
        >
          <input ref={fileInput} type="file" accept="image/*" multiple hidden
            onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = '' }} />
          <svg className="w-12 h-12 mx-auto mb-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="font-medium mb-1">Drop photos here, or click to browse</p>
          <p className="text-text-muted text-sm">JPG, PNG, WebP or GIF · up to 15&nbsp;MB each</p>
          {uploading > 0 && <p className="text-accent-secondary text-sm mt-3">Uploading {uploading}…</p>}
        </div>

        {error && (
          <p className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Photo grid */}
        {project.photos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {project.photos.map((photo, i) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                projectId={project.id}
                index={i}
                tags={tags}
                retouchEnabled={config?.retouch_enabled ?? false}
                selected={selected.has(photo.id)}
                onToggleSelect={toggleSelect}
                onUpdate={updatePhoto}
                onRemove={removePhoto}
                onRetouch={retouch}
                onRevert={revert}
              />
            ))}
          </div>
        )}

        {/* Batch action bar */}
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky bottom-4 z-40 glass-card !bg-background-elevated/95 p-4 mb-8 shadow-card"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">{selected.size} selected</span>
              <button type="button"
                onClick={() => setSpliceOn((s) => !s)}
                className={`chip ${spliceOn ? 'chip-active' : ''}`}
                title="Combine the selected photos into one seamless composite shot">
                Splice into one
              </button>
              <button type="button"
                onClick={() => setTouchUpOn((s) => !s)}
                className={`chip ${touchUpOn ? 'chip-active' : ''}`}
                title="Stage like a show home: remove clutter, professional grade">
                Touch up
              </button>
              <input
                className="input-field !py-2 text-sm flex-1 min-w-48"
                placeholder="Optional note (e.g. 'remove the towel and baby bath')"
                value={batchInstruction}
                onChange={(e) => setBatchInstruction(e.target.value)}
              />
              <button type="button" className="btn-primary !py-2 text-sm"
                onClick={applyBatch}
                disabled={batchBusy || (!spliceOn && !touchUpOn) || (spliceOn && selected.size < 2)}>
                {batchBusy ? 'Starting…'
                  : spliceOn
                    ? `Splice ${selected.size}${touchUpOn ? ' + touch up' : ''} · ~$0.06`
                    : `Touch up ${selected.size} · ~$${(selected.size * 0.06).toFixed(2)}`}
              </button>
              <button type="button" className="btn-ghost !py-2 text-sm" onClick={() => setSelected(new Set())}>
                Clear
              </button>
            </div>
            {spliceOn && selected.size < 2 && (
              <p className="text-xs text-text-muted mt-2">Select at least 2 photos to splice.</p>
            )}
            {spliceOn && (
              <p className="text-xs text-text-muted mt-2">
                Splice creates a new combined photo — your originals are kept (delete them after if you don't want them on the site).
              </p>
            )}
          </motion.div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-text-muted text-sm">
            {project.photos.length} photo{project.photos.length === 1 ? '' : 's'} ·{' '}
            {project.photos.some((p) => p.tag === 'hero')
              ? 'hero shot tagged'
              : 'tip: tag your best shot as "hero"'}
          </p>
          <button className="btn-primary text-lg !px-10" onClick={generate}
            disabled={project.photos.length === 0 || uploading > 0 || starting}>
            {starting ? 'Starting…' : 'Generate website'}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </button>
        </div>
      </div>
    </Shell>
  )
}

function PhotoCard({ photo, projectId, index, tags, retouchEnabled, selected, onToggleSelect, onUpdate, onRemove, onRetouch, onRevert }: {
  photo: Photo
  projectId: string
  index: number
  tags: string[]
  retouchEnabled: boolean
  selected: boolean
  onToggleSelect: (photoId: string) => void
  onUpdate: (photo: Photo, fields: { tag?: string; caption?: string }) => void
  onRemove: (photo: Photo) => void
  onRetouch: (photo: Photo, instruction: string) => void
  onRevert: (photo: Photo) => void
}) {
  const [showRetouch, setShowRetouch] = useState(false)
  const [instruction, setInstruction] = useState('')
  const editing = photo.edit_status === 'editing'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
      className={`glass-card overflow-hidden group transition-all duration-200 ${selected ? 'ring-2 ring-accent-primary shadow-glow' : ''}`}
    >
      <div className="relative aspect-[4/3] bg-background-elevated">
        <img src={api.photoUrl(projectId, photo.id, photo.filename)}
          alt={photo.caption || photo.original_name}
          className={`w-full h-full object-cover transition-all duration-500 ${editing ? 'opacity-40 blur-[2px]' : ''}`}
          loading="lazy" />
        {photo.tag !== 'artwork' && (
          <button
            onClick={() => onToggleSelect(photo.id)}
            aria-label={selected ? 'Deselect photo' : 'Select photo'}
            className={`absolute top-2 left-2 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all backdrop-blur ${
              selected
                ? 'bg-accent-primary border-accent-primary text-white'
                : 'bg-black/40 border-white/50 text-transparent hover:border-white opacity-0 group-hover:opacity-100'
            } ${selected ? '!opacity-100' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
        {editing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-accent-primary/40 border-t-accent-primary rounded-full animate-spin" />
            <span className="text-xs font-medium text-white drop-shadow">AI retouching…</span>
          </div>
        )}
        <button
          onClick={() => onRemove(photo)}
          aria-label="Delete photo"
          className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 backdrop-blur text-white/80 hover:text-white hover:bg-red-500/80 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-xs font-mono text-accent-glow">
          {photo.tag}
        </span>
        {photo.original_filename && !editing && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500/30 backdrop-blur text-xs font-medium text-emerald-200">
            retouched
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button key={t} type="button" title={TAG_HINTS[t]}
              onClick={() => onUpdate(photo, { tag: t })}
              className={`chip !py-0.5 !px-2 text-xs ${photo.tag === t ? 'chip-active' : ''}`}>
              {t}
            </button>
          ))}
        </div>
        <input
          className="input-field !py-2 text-sm"
          placeholder="Caption (optional)"
          defaultValue={photo.caption}
          onBlur={(e) => e.target.value !== photo.caption && onUpdate(photo, { caption: e.target.value })}
        />

        {retouchEnabled && photo.tag !== 'artwork' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button type="button"
                onClick={() => setShowRetouch((s) => !s)}
                disabled={editing}
                className="btn-ghost flex-1 !py-1.5 text-xs">
                {editing ? 'Retouching…' : 'AI retouch'}
              </button>
              {photo.original_filename && !editing && (
                <button type="button" onClick={() => onRevert(photo)}
                  className="btn-ghost !py-1.5 text-xs" title="Restore the original photo">
                  Revert
                </button>
              )}
            </div>
            {showRetouch && !editing && (
              <div className="space-y-2">
                <textarea
                  className="input-field !py-2 text-xs min-h-16"
                  placeholder="Optional: what to change (e.g. 'remove the towel and baby bath'). Leave blank and the AI art director stages it like a show home."
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                />
                <button type="button" className="btn-primary w-full !py-1.5 text-xs"
                  onClick={() => { onRetouch(photo, instruction); setShowRetouch(false); setInstruction('') }}>
                  Retouch · ~$0.06
                </button>
              </div>
            )}
            {photo.edit_status === 'error' && (
              <p className="text-xs text-red-400">{photo.edit_error}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
