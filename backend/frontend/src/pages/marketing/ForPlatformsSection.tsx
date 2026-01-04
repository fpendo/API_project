import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const platformTypes = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Environmental Exchanges',
    description: 'Build your marketplace on verified, blockchain-backed credits',
    example: 'Like Entrade',
    benefits: [
      'White-label trading interface',
      'Real-time order book integration',
      'Automated settlement via API',
      'Full regulatory compliance built-in',
    ],
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Environmental Consultants',
    description: 'Offer verified credits and compliance services to your clients',
    example: 'Like Greenshank',
    benefits: [
      'Credit lookup & verification API',
      'Client portal white-label',
      'Catchment capacity data',
      'Compliance documentation',
    ],
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Offset Brokers',
    description: 'Access the national registry directly for faster, verified trades',
    example: 'Brokerages & Advisors',
    benefits: [
      'Direct registry access',
      'Instant credit verification',
      'Transaction submission API',
      'Webhook notifications',
    ],
  },
]

const codeExample = `// Verify and purchase credits via API
const credits = await nemx.registry.query({
  catchment: 'stodmarsh',
  unitType: 'nitrate',
  available: true
});

// Execute purchase (fee: 0.3% of notional)
const transaction = await nemx.trading.buy({
  creditId: credits[0].id,
  quantity: 50,
  maxPrice: 42.00,
  buyerAddress: developer.wallet
});

// Credits are automatically transferred
console.log(transaction.status); // 'settled'`

export default function ForPlatformsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} id="platforms" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                          linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* Accent gradient */}
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-cyan-500/10 to-transparent blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-accent-secondary text-sm font-semibold uppercase tracking-widest">For Platforms</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mt-4 mb-6">
            Power Your Platform with<br />
            <span className="gradient-text">National Registry Infrastructure</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Whether you're building a marketplace, offering consulting services, or brokering deals — 
            our API gives you access to the UK's environmental credit registry.
          </p>
        </motion.div>

        {/* Platform types */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          {platformTypes.map((platform, index) => (
            <motion.div
              key={platform.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="p-8 rounded-2xl bg-background-surface/50 border border-border hover:border-accent-secondary/50 transition-colors group"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-secondary/20 to-accent-primary/20 flex items-center justify-center text-accent-secondary mb-6 group-hover:scale-110 transition-transform">
                {platform.icon}
              </div>
              
              <h3 className="text-xl font-bold text-text-primary mb-2">{platform.title}</h3>
              <p className="text-text-secondary mb-2">{platform.description}</p>
              <p className="text-sm text-accent-secondary/80 mb-6">{platform.example}</p>
              
              <ul className="space-y-3">
                {platform.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-text-secondary text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Code example */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        >
          {/* Left side - text */}
          <div>
            <h3 className="text-3xl font-bold text-text-primary mb-6">
              One API. Complete Access.
            </h3>
            <p className="text-lg text-text-secondary mb-6">
              Integrate with our RESTful API in minutes. Query the registry, submit transactions, 
              and receive real-time webhooks for all credit events.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-text-primary font-semibold">API Key Authentication</p>
                  <p className="text-sm text-text-muted">Secure, scoped API keys with rate limiting</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-text-primary font-semibold">Webhooks</p>
                  <p className="text-sm text-text-muted">Real-time notifications for all events</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-text-primary font-semibold">OpenAPI Spec</p>
                  <p className="text-sm text-text-muted">Full documentation with SDKs</p>
                </div>
              </div>
            </div>

            <a
              href="#docs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-secondary to-cyan-400 text-background-deep font-semibold rounded-lg hover:shadow-glow-lg transition-all"
            >
              View API Documentation
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          {/* Right side - code block */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-accent-secondary/20 to-accent-primary/20 blur-3xl opacity-30" />
            <div className="relative rounded-2xl overflow-hidden border border-border bg-background-elevated">
              {/* Code header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-background-surface border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs text-text-muted ml-2">purchase-credits.ts</span>
              </div>
              
              {/* Code content */}
              <pre className="p-6 text-sm text-text-secondary overflow-x-auto">
                <code>{codeExample}</code>
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

