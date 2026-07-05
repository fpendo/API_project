import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../api'
import { Project } from '../types'

export default function Sites() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => api.listProjects().then(setProjects).catch((e) => setError(e.message))
  useEffect(() => { refresh() }, [])

  const remove = async (p: Project) => {
    if (!window.confirm(`Delete "${p.name}" and all its photos and generated files? This cannot be undone.`)) return
    await api.deleteProject(p.id)
    refresh()
  }

  return (
    <Shell>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-10">
        <div>
          <h1 className="font-display font-bold text-3xl md:text-4xl mb-1">My Sites</h1>
          <p className="text-text-muted">Every project keeps its own ringfenced storage.</p>
        </div>
        <Link to="/create" className="btn-primary">
          Create Website
        </Link>
      </div>

      {error && (
        <p className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
      )}

      {projects === null ? (
        <p className="text-text-muted">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="font-display text-xl mb-2">No sites yet</p>
          <p className="text-text-muted mb-8">Answer the questionnaire, add photos, and generate your first motion website.</p>
          <Link to="/create" className="btn-primary">Create Website</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p, i) => (
            <motion.div key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.4) }}
              className="glass-card overflow-hidden group hover:border-accent-primary/50 transition-colors duration-300"
            >
              <Link to={`/project/${p.id}/studio`} className="block">
                <div className="aspect-video bg-background-elevated relative overflow-hidden">
                  {p.photos.length > 0 ? (
                    <img src={api.photoUrl(p.id, (p.photos.find((x) => x.tag === 'hero') ?? p.photos[0]).id)}
                      alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">No photos yet</div>
                  )}
                  <span className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-medium rounded-full border backdrop-blur ${
                    p.status === 'ready' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : p.status === 'generating' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : p.status === 'error' ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : 'bg-slate-500/30 text-slate-300 border-slate-500/30'
                  }`}>
                    {p.status === 'generating' ? 'Generating…' : p.status}
                  </span>
                </div>
              </Link>
              <div className="p-5">
                <h3 className="font-display font-semibold text-lg mb-1 group-hover:text-accent-glow transition-colors">
                  {p.name}
                </h3>
                <p className="text-text-muted text-xs mb-4">
                  {p.photos.length} photo{p.photos.length === 1 ? '' : 's'} · updated {new Date(p.updated_at * 1000).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Link to={`/project/${p.id}/studio`} className="text-accent-primary hover:text-accent-glow font-medium">Studio</Link>
                  <span className="text-border">·</span>
                  <Link to={`/project/${p.id}/photos`} className="text-text-secondary hover:text-text-primary">Photos</Link>
                  <span className="text-border">·</span>
                  <Link to={`/project/${p.id}/brief`} className="text-text-secondary hover:text-text-primary">Brief</Link>
                  <button onClick={() => remove(p)} aria-label={`Delete ${p.name}`}
                    className="ml-auto text-text-muted hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Shell>
  )
}
