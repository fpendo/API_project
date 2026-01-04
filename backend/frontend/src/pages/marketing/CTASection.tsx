import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Demo requested:', email)
    setEmail('')
    alert('Thank you! We will be in touch shortly.')
  }

  return (
    <section ref={sectionRef} id="contact" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background-deep via-background to-background-deep" />
      
      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-primary/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent-secondary/20 rounded-full blur-3xl"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-6">
            Build on the Registry.<br />
            <span className="gradient-text">Power Your Platform.</span>
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
            Whether you're a marketplace, broker, or consultant — our API gives you 
            access to the UK's environmental credit infrastructure.
          </p>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-8">
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-5 py-4 rounded-xl bg-background-surface border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-gradient-to-r from-accent-primary to-emerald-400 text-background-deep font-semibold rounded-xl hover:shadow-glow transition-all whitespace-nowrap"
              >
                Request Demo
              </button>
            </div>
          </form>

          <p className="text-sm text-text-muted">
            Free for supply-side users. API access for platforms.
          </p>

          {/* Quick contact options */}
          <div className="flex flex-wrap justify-center gap-6 mt-12">
            <a
              href="mailto:hello@nemx.io"
              className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              hello@nemx.io
            </a>
            <a
              href="tel:+441onal"
              className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Schedule a Call
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

