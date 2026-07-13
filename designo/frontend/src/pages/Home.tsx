import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Shell'
import Particles from '../components/Particles'
import { api } from '../api'

const pillars = [
  {
    title: 'Cinematic by default',
    body: 'Scroll-driven motion, film grain, glass and choreography — websites that move like title sequences, not templates. Every site is designed around your business, never off a shelf.',
  },
  {
    title: 'Built for the agent economy',
    body: 'Search is changing. When customers ask ChatGPT or Google\u2019s AI to recommend a business, most websites are invisible to them. Every Twin Native site ships with a machine-readable shadow site — so AI assistants can read, understand and recommend you from day one.',
  },
  {
    title: 'Visible on Google, provably',
    body: 'Structured data, Search Console and indexing handled at launch — then a weekly report every Monday morning showing exactly how many people found you, what they searched, and what to do next. No jargon, no guesswork.',
  },
]

const angieFacts = [
  { k: '15 years', v: 'at Cheil — Samsung\u2019s global marketing agency — as a senior account director' },
  { k: 'Samsung Concierge', v: 'conceived and built Samsung\u2019s concierge application' },
  { k: 'A first for Colombia', v: 'ran the country\u2019s first digital election campaign, for President-elect Juan Manuel Santos' },
]

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    api.authMe().then((r) => setAuthed(r.authenticated)).catch(() => setAuthed(false))
  }, [])

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
            <a href="#about" className="hidden sm:block px-4 py-2 text-text-muted hover:text-text-primary hover:bg-background-elevated rounded-lg transition-all duration-200 text-sm">
              About
            </a>
            {authed ? (
              <Link to="/sites" className="btn-primary !px-5 !py-2 text-sm">Enter studio</Link>
            ) : (
              <Link to="/login" className="btn-ghost !px-5 !py-2 text-sm">Log in</Link>
            )}
          </nav>
        </header>

        {/* Hero */}
        <section className="relative min-h-[80vh] flex items-center">
          <Particles />
          <div className="max-w-7xl mx-auto px-6 py-20 text-center w-full">
            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-accent-secondary font-mono text-sm tracking-[0.3em] uppercase mb-6"
            >
              Twin Native
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display font-bold text-5xl md:text-7xl lg:text-8xl leading-[1.02] tracking-tight mb-8"
            >
              Beautiful websites,
              <br />
              <span className="gradient-text">ready for what&rsquo;s coming.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-12"
            >
              We design cinematic, motion-driven websites — and build every one for the
              agent economy, so AI assistants can find and recommend your business,
              not just people with browsers.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex items-center justify-center gap-4 flex-wrap"
            >
              <a href="#what" className="btn-primary text-lg !px-10 !py-4">
                What we do
              </a>
              <a href="#about" className="btn-ghost text-lg !px-8 !py-4">
                Meet the founder
              </a>
            </motion.div>
          </div>
        </section>

        {/* What we do */}
        <section id="what" className="max-w-7xl mx-auto px-6 py-24 scroll-mt-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}
            className="font-display font-bold text-3xl md:text-5xl text-center mb-4"
          >
            Two websites in <span className="gradient-text">one</span>
          </motion.h2>
          <p className="text-text-muted text-center max-w-2xl mx-auto mb-16">
            One your customers fall for. One the machines can read. Most agencies build the first.
            Almost nobody builds the second — yet that&rsquo;s where your next customers are already searching.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="glass-card p-8"
              >
                <h3 className="font-display font-semibold text-xl mb-3 gradient-text inline-block">{p.title}</h3>
                <p className="text-text-muted leading-relaxed text-[15px]">{p.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* About Angie */}
        <section id="about" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}
            className="glass-card p-10 md:p-14"
          >
            <div className="grid md:grid-cols-[1fr_1.6fr] gap-10 items-start">
              <div>
                <p className="text-accent-secondary font-mono text-xs tracking-[0.25em] uppercase mb-4">Founder</p>
                <h2 className="font-display font-bold text-3xl md:text-4xl mb-2">Angie Pendarves</h2>
                <p className="text-text-muted mb-8">Creative direction, with the data to back it up.</p>
                <div className="space-y-5">
                  {angieFacts.map((f) => (
                    <div key={f.k} className="border-l-2 border-accent-primary/50 pl-4">
                      <p className="font-display font-semibold">{f.k}</p>
                      <p className="text-text-muted text-sm leading-relaxed">{f.v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-text-secondary leading-relaxed space-y-5 text-[15.5px]">
                <p>
                  Angie spent fifteen years at Cheil — the agency behind Samsung&rsquo;s global marketing —
                  as a senior account director, where the brief was never &ldquo;make it pretty&rdquo;.
                  It was: make it beautiful <em>and</em> prove it works.
                </p>
                <p>
                  Her crowning work there was building Samsung&rsquo;s concierge application — a product
                  used by millions that had to feel effortless while orchestrating enormous complexity
                  behind the scenes. Before that, she ran Colombia&rsquo;s first digital election
                  campaign for president-elect Juan Manuel Santos: a country-scale exercise in reaching
                  the right people, with the right message, measurably.
                </p>
                <p>
                  Twin Native is that same discipline applied to local business. Every site we ship is
                  designed like a brand film, engineered like a product — and instrumented so you can
                  watch it earn its keep, one Monday-morning report at a time.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Closing */}
        <section className="max-w-4xl mx-auto px-6 pb-28 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}
            className="glass-card p-12 md:p-16"
          >
            <h2 className="font-display font-bold text-3xl md:text-5xl mb-6">
              The agent economy is coming.
            </h2>
            <p className="text-text-secondary mb-4 max-w-lg mx-auto">
              Your customers will soon ask an AI before they ask Google. We make sure the answer is you.
            </p>
            <p className="text-text-muted text-sm">
              Twin Native works by invitation — if we&rsquo;ve written to you, your website is already built.
              Check your email for your private preview link.
            </p>
          </motion.div>
        </section>

        <footer className="border-t border-border">
          <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3 text-text-muted text-sm">
            <p>Twin Native · Part of the Nemx Group</p>
            <Link to="/login" className="hover:text-text-primary transition-colors">Studio login</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
