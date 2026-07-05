import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Shell'
import Particles from '../components/Particles'

const steps = [
  {
    n: '01',
    title: 'Tell us about the business',
    body: 'A short questionnaire captures everything the generator needs — name, audience, tone, colours, sections and copy points.',
  },
  {
    n: '02',
    title: 'Load your photos, with tags',
    body: 'Drag in imagery and tag each shot — hero, product, team, gallery — into your project\u2019s own ringfenced storage.',
  },
  {
    n: '03',
    title: 'Generate a motion website',
    body: 'Claude assembles a scroll-driven cinematic site around your brief and photos. Preview it live, then refine it by chatting.',
  },
]

const effects = [
  { title: 'Film grain', body: 'A living, animated grain layer that gives every page a cinematic texture.' },
  { title: 'Particles', body: 'A subtle drifting particle field with scroll parallax depth.' },
  { title: 'Vignette', body: 'Radial framing that pulls the eye into the story.' },
  { title: 'Glass cards', body: 'Frosted, layered surfaces for services, stats and testimonials.' },
  { title: 'Colour tints', body: 'Each act of the page carries its own atmospheric tint, crossfading on scroll.' },
  { title: 'Scroll pacing', body: 'Pinned sequences, scrubbed timelines and Ken Burns photography — choreographed, not decorated.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[1100px] h-[1100px] bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-accent-secondary/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/3" />
      </div>

      <div className="relative z-10">
        <header className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link to="/sites" className="px-4 py-2 text-text-muted hover:text-text-primary hover:bg-background-elevated rounded-lg transition-all duration-200 text-sm">
              My Sites
            </Link>
            <a href="/" className="px-4 py-2 text-text-muted hover:text-text-primary hover:bg-background-elevated rounded-lg transition-all duration-200 text-sm">
              Portal
            </a>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative min-h-[82vh] flex items-center">
          <Particles />
          <div className="max-w-7xl mx-auto px-6 py-20 text-center w-full">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-accent-secondary font-mono text-sm tracking-[0.3em] uppercase mb-6"
            >
              Motion Website Generator
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display font-bold text-5xl md:text-7xl lg:text-8xl leading-[1.02] tracking-tight mb-8"
            >
              Your brief. Your photos.
              <br />
              <span className="gradient-text">A cinematic website.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-12"
            >
              Designo turns a short questionnaire and your tagged photography into a
              scroll-driven motion website — film grain, particles, glass and
              choreography included.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex items-center justify-center gap-4 flex-wrap"
            >
              <Link to="/create" className="btn-primary text-lg !px-10 !py-4">
                Create Website
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link to="/sites" className="btn-ghost text-lg !px-8 !py-4">
                View my sites
              </Link>
            </motion.div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="font-display font-bold text-3xl md:text-5xl text-center mb-16"
          >
            Three steps to <span className="gradient-text">stunning</span>
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="glass-card p-8"
              >
                <div className="font-mono text-accent-secondary text-sm mb-4">{s.n}</div>
                <h3 className="font-display font-semibold text-xl mb-3">{s.title}</h3>
                <p className="text-text-muted leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Six effects */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="font-display font-bold text-3xl md:text-5xl text-center mb-4"
          >
            Six signature effects
          </motion.h2>
          <p className="text-text-muted text-center max-w-xl mx-auto mb-16">
            Every generated site ships with the full cinematic stack — tuned to your brand, not bolted on.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {effects.map((e, i) => (
              <motion.div
                key={e.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                className="glass-card p-6 hover:border-accent-primary/50 transition-colors duration-300"
              >
                <h3 className="font-display font-semibold text-lg mb-2 gradient-text inline-block">{e.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{e.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-4xl mx-auto px-6 py-28 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="glass-card p-12 md:p-16"
          >
            <h2 className="font-display font-bold text-3xl md:text-5xl mb-6">
              Ready when you are.
            </h2>
            <p className="text-text-secondary mb-10 max-w-lg mx-auto">
              Five minutes of questions, a handful of photos, and Designo does the rest.
            </p>
            <Link to="/create" className="btn-primary text-lg !px-10 !py-4">
              Create Website
            </Link>
          </motion.div>
        </section>

        <footer className="border-t border-border">
          <div className="max-w-7xl mx-auto px-6 py-6 text-center text-text-muted text-sm">
            <p>Designo · Motion websites from a brief and your photos</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
