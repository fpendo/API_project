import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const codeExample = `// Fetch available credits via API
const credits = await nemx.credits.list({
  catchment: "solent",
  unit_type: "nitrate",
  status: "available"
});

// Purchase credits for your project
const purchase = await nemx.trading.buy({
  scheme_id: credits[0].scheme_id,
  quantity: 50,
  price_limit: 2500
});

// Returns blockchain-verified certificate
console.log(purchase.certificate_id);
// → "NEMX-2026-SOL-00847"`

const techFeatures = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    title: 'Blockchain Anchored',
    description: 'Every credit is minted as an ERC-1155 token on Polygon. Immutable, auditable, verifiable.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: 'RESTful API',
    description: 'Full OpenAPI documentation. Python, JavaScript, and cURL examples. Sandbox environment.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: 'Real-Time Webhooks',
    description: 'Get notified instantly when schemes are approved, credits are traded, or applications are submitted.',
  },
]

export default function TechnologySection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} id="docs" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Dark background with subtle pattern */}
      <div className="absolute inset-0 bg-background-deep">
        {/* Circuit pattern */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10h80v80H10z' fill='none' stroke='%2310b981' stroke-width='0.5'/%3E%3Ccircle cx='10' cy='10' r='3' fill='%2310b981'/%3E%3Ccircle cx='90' cy='10' r='3' fill='%2310b981'/%3E%3Ccircle cx='10' cy='90' r='3' fill='%2310b981'/%3E%3Ccircle cx='90' cy='90' r='3' fill='%2310b981'/%3E%3Cpath d='M50 10v30M50 60v30M10 50h30M60 50h30' stroke='%2310b981' stroke-width='0.5'/%3E%3C/svg%3E")`,
          }}
        />
      </div>
      
      {/* Gradient accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-r from-accent-primary/10 via-transparent to-accent-secondary/10 blur-3xl rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-accent-primary text-sm font-semibold uppercase tracking-widest">Technology</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mt-4 mb-6">
            Built for Trust. <span className="gradient-text">Designed for Scale.</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Enterprise-grade API infrastructure. Integrate NEMX into your existing systems 
            with a few lines of code.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Code example */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden border border-border shadow-2xl">
              {/* Editor header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-background-elevated border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="ml-2 text-xs text-text-muted font-mono">example.ts</span>
              </div>
              
              {/* Code content */}
              <div className="p-6 bg-background-surface font-mono text-sm overflow-x-auto">
                <pre className="text-text-secondary">
                  {codeExample.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="w-8 text-text-disabled select-none">{i + 1}</span>
                      <span 
                        className={
                          line.includes('//') 
                            ? 'text-text-muted' 
                            : line.includes('"') 
                              ? 'text-emerald-400' 
                              : line.includes('await') || line.includes('const')
                                ? 'text-purple-400'
                                : 'text-text-primary'
                        }
                      >
                        {line}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>
            
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 blur-3xl -z-10 opacity-50" />
          </motion.div>

          {/* Tech features */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-8"
          >
            {techFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="flex gap-4 p-4 rounded-xl bg-background-surface/30 border border-border/50 hover:border-accent-primary/30 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">{feature.title}</h3>
                  <p className="text-sm text-text-muted">{feature.description}</p>
                </div>
              </motion.div>
            ))}

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a
                href="#docs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-primary to-emerald-400 text-background-deep font-semibold rounded-lg hover:shadow-glow transition-all"
              >
                View API Documentation
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <a
                href="#sandbox"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-background-surface border border-border text-text-primary font-semibold rounded-lg hover:border-accent-primary/50 transition-colors"
              >
                Try Sandbox
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

