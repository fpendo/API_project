import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import Shell from '../components/Shell'
import { api } from '../api'
import { Brief, EMPTY_BRIEF } from '../types'

const SECTION_OPTIONS = [
  { id: 'hero', label: 'Hero' },
  { id: 'about', label: 'About / Story' },
  { id: 'services', label: 'Services / Offering' },
  { id: 'gallery', label: 'Photo gallery' },
  { id: 'products', label: 'Products' },
  { id: 'team', label: 'Team' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'stats', label: 'Stats / Numbers' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
]

const TONE_SUGGESTIONS = ['Premium & confident', 'Warm & personal', 'Bold & energetic', 'Minimal & calm', 'Playful', 'Authoritative']
const MOOD_SUGGESTIONS = ['Dark & cinematic', 'Light & airy', 'Earthy & natural', 'Vibrant & colourful', 'Monochrome editorial']

interface StepDef {
  title: string
  subtitle: string
}

const STEPS: StepDef[] = [
  { title: 'The business', subtitle: 'Who is this website for?' },
  { title: 'Voice & look', subtitle: 'How should it feel?' },
  { title: 'Structure & content', subtitle: 'What goes on the page?' },
  { title: 'Contact details', subtitle: 'How do people reach you?' },
  { title: 'Style & motion', subtitle: 'Final creative direction.' },
]

export default function Wizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [brief, setBrief] = useState<Brief>(EMPTY_BRIEF)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.getProject(id)
      .then((p) => setBrief({ ...EMPTY_BRIEF, ...p.brief }))
      .catch((e) => setError(e.message))
  }, [id])

  const set = <K extends keyof Brief>(key: K, value: Brief[K]) =>
    setBrief((b) => ({ ...b, [key]: value }))

  const toggleSection = (sectionId: string) =>
    set('sections', brief.sections.includes(sectionId)
      ? brief.sections.filter((s) => s !== sectionId)
      : [...brief.sections, sectionId])

  const canContinue = step === 0 ? brief.business_name.trim().length > 0 : true

  const finish = async () => {
    setSaving(true)
    setError(null)
    try {
      const project = id
        ? await api.updateBrief(id, brief)
        : await api.createProject(brief.business_name.trim(), brief)
      if (id) await api.updateBrief(project.id, brief)
      navigate(`/project/${project.id}/photos`)
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish())

  return (
    <Shell>
      <div className="max-w-3xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              onClick={() => i < step && setStep(i)}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-gradient-to-r from-accent-primary to-accent-secondary' : 'bg-border'
              } ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
              aria-label={`Step ${i + 1}: ${s.title}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            <p className="text-accent-secondary font-mono text-xs tracking-[0.25em] uppercase mb-2">
              Step {step + 1} of {STEPS.length}
            </p>
            <h1 className="font-display font-bold text-3xl md:text-4xl mb-2">{STEPS[step].title}</h1>
            <p className="text-text-muted mb-8">{STEPS[step].subtitle}</p>

            <div className="glass-card p-8 space-y-6">
              {step === 0 && (
                <>
                  <Field label="Business / project name *">
                    <input className="input-field" value={brief.business_name}
                      onChange={(e) => set('business_name', e.target.value)}
                      placeholder="e.g. Harbourlight Coffee Roasters" autoFocus />
                  </Field>
                  <Field label="Tagline or one-line pitch">
                    <input className="input-field" value={brief.tagline}
                      onChange={(e) => set('tagline', e.target.value)}
                      placeholder="e.g. Small-batch coffee, roasted by the sea" />
                  </Field>
                  <Field label="Industry / what you do">
                    <input className="input-field" value={brief.industry}
                      onChange={(e) => set('industry', e.target.value)}
                      placeholder="e.g. Speciality coffee roastery and café" />
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  <Field label="Who is the audience?">
                    <input className="input-field" value={brief.audience}
                      onChange={(e) => set('audience', e.target.value)}
                      placeholder="e.g. Local food lovers and wholesale café buyers" />
                  </Field>
                  <Field label="Tone of voice" hint={TONE_SUGGESTIONS} onHint={(v) => set('tone', v)}>
                    <input className="input-field" value={brief.tone}
                      onChange={(e) => set('tone', e.target.value)}
                      placeholder="How should the copy sound?" />
                  </Field>
                  <Field label="Visual mood" hint={MOOD_SUGGESTIONS} onHint={(v) => set('mood', v)}>
                    <input className="input-field" value={brief.mood}
                      onChange={(e) => set('mood', e.target.value)}
                      placeholder="How should it look and feel?" />
                  </Field>
                  <Field label="Brand colours (if any)">
                    <input className="input-field" value={brief.brand_colors}
                      onChange={(e) => set('brand_colors', e.target.value)}
                      placeholder="e.g. deep green #14532d, cream, brass — or leave blank" />
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="Sections to include">
                    <div className="flex flex-wrap gap-2">
                      {SECTION_OPTIONS.map((s) => (
                        <button key={s.id} type="button"
                          onClick={() => toggleSection(s.id)}
                          className={`chip ${brief.sections.includes(s.id) ? 'chip-active' : ''}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Services / products / offering (one per line)">
                    <textarea className="input-field min-h-28" value={brief.services}
                      onChange={(e) => set('services', e.target.value)}
                      placeholder={'e.g.\nSingle-origin subscriptions\nWholesale supply\nBarista training'} />
                  </Field>
                  <Field label="Key points the site must get across">
                    <textarea className="input-field min-h-28" value={brief.key_points}
                      onChange={(e) => set('key_points', e.target.value)}
                      placeholder="Awards, story, differentiators, opening hours — raw notes are fine, we write the copy" />
                  </Field>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field label="Email">
                      <input className="input-field" type="email" value={brief.contact_email}
                        onChange={(e) => set('contact_email', e.target.value)}
                        placeholder="hello@example.co.uk" />
                    </Field>
                    <Field label="Phone">
                      <input className="input-field" value={brief.contact_phone}
                        onChange={(e) => set('contact_phone', e.target.value)}
                        placeholder="+44 ..." />
                    </Field>
                  </div>
                  <Field label="Address / location">
                    <input className="input-field" value={brief.address}
                      onChange={(e) => set('address', e.target.value)}
                      placeholder="e.g. 12 Harbour Street, Ilfracombe, Devon" />
                  </Field>
                  <Field label="Social links (one per line)">
                    <textarea className="input-field min-h-24" value={brief.socials}
                      onChange={(e) => set('socials', e.target.value)}
                      placeholder={'https://instagram.com/...\nhttps://facebook.com/...'} />
                  </Field>
                </>
              )}

              {step === 4 && (
                <>
                  <Field label="Websites or styles you admire">
                    <textarea className="input-field min-h-24" value={brief.style_references}
                      onChange={(e) => set('style_references', e.target.value)}
                      placeholder="Links or descriptions — e.g. 'like Aesop, minimal with big photography'" />
                  </Field>
                  <Field label="Motion intensity">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['subtle', 'balanced', 'cinematic'] as const).map((m) => (
                        <button key={m} type="button"
                          onClick={() => set('motion_intensity', m)}
                          className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                            brief.motion_intensity === m
                              ? 'border-accent-primary bg-accent-primary/10'
                              : 'border-border hover:border-accent-primary/50'
                          }`}>
                          <div className="font-medium capitalize mb-1">{m}</div>
                          <div className="text-xs text-text-muted">
                            {m === 'subtle' && 'Gentle reveals, no pinning'}
                            {m === 'balanced' && 'The full recipe, tastefully'}
                            {m === 'cinematic' && 'Maximum choreography'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Anything else the designer should know?">
                    <textarea className="input-field min-h-24" value={brief.extra_notes}
                      onChange={(e) => set('extra_notes', e.target.value)}
                      placeholder="Optional" />
                  </Field>
                </>
              )}
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
            )}

            <div className="flex items-center justify-between mt-8">
              <button className="btn-ghost" onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))} disabled={saving}>
                Back
              </button>
              <button className="btn-primary" onClick={next} disabled={!canContinue || saving}>
                {saving ? 'Saving…' : step === STEPS.length - 1 ? 'Save & add photos' : 'Continue'}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Shell>
  )
}

function Field({ label, hint, onHint, children }: {
  label: string
  hint?: string[]
  onHint?: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
      {children}
      {hint && onHint && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {hint.map((h) => (
            <button key={h} type="button" className="chip !py-1 !px-2.5 text-xs" onClick={() => onHint(h)}>
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
