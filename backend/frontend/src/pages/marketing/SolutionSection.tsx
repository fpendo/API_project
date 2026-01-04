import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const flowSteps = [
  {
    icon: '🌾',
    title: 'Landowner',
    description: 'Creates mitigation scheme and generates credits',
    color: 'from-emerald-500 to-emerald-600',
    borderColor: 'border-emerald-500/30',
  },
  {
    icon: '⚖️',
    title: 'Regulator',
    description: 'Approves & certifies scheme on-chain',
    color: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-500/30',
  },
  {
    icon: '🏗️',
    title: 'Developer',
    description: 'Purchases verified credits',
    color: 'from-amber-500 to-amber-600',
    borderColor: 'border-amber-500/30',
  },
  {
    icon: '📋',
    title: 'Planning',
    description: 'Burns credits on approval',
    color: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-500/30',
  },
]

export default function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} id="features" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Light gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background-deep via-background to-background-deep" />
      
      {/* Subtle accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-accent-primary/5 blur-3xl rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-accent-primary text-sm font-semibold uppercase tracking-widest">How It Works</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mt-4 mb-6">
            The Credit Lifecycle
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Our infrastructure handles the complete credit journey — from creation 
            through trading to retirement — with full auditability at every step.
          </p>
        </motion.div>

        {/* Flow diagram */}
        <div className="relative">
          {/* Connection line - desktop */}
          <svg className="hidden lg:block absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2" preserveAspectRatio="none">
            <motion.line
              x1="12%"
              y1="50%"
              x2="88%"
              y2="50%"
              stroke="url(#flow-gradient)"
              strokeWidth="2"
              strokeDasharray="8 4"
              initial={{ pathLength: 0 }}
              animate={isInView ? { pathLength: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
            <defs>
              <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="33%" stopColor="#3b82f6" />
                <stop offset="66%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>

          {/* Flow steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {flowSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
                className="relative group"
              >
                {/* Arrow between steps - mobile/tablet */}
                {index < flowSteps.length - 1 && (
                  <div className="lg:hidden absolute -bottom-6 left-1/2 -translate-x-1/2 text-2xl text-text-muted/30 sm:hidden">
                    ↓
                  </div>
                )}

                {/* Card */}
                <div className={`relative p-6 rounded-2xl bg-background-surface/50 backdrop-blur-sm border ${step.borderColor} hover:border-opacity-60 transition-all group-hover:shadow-lg`}>
                  {/* Step number */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background-elevated border border-border flex items-center justify-center">
                    <span className="text-sm font-bold text-text-muted">{index + 1}</span>
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <span className="text-3xl">{step.icon}</span>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-text-primary mb-2">{step.title}</h3>
                  <p className="text-text-muted text-sm">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Key benefits */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              title: 'Instant Verification',
              description: 'QR code validation for planning officers. Verify credit ownership in seconds.',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              title: 'Blockchain Anchored',
              description: 'Every credit is minted as a digital certificate. Immutable audit trail.',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
              title: 'Real-Time Market',
              description: 'Live orderbook with transparent pricing. Buy and sell credits instantly.',
            },
          ].map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center">
                {benefit.icon}
              </div>
              <div>
                <h4 className="font-semibold text-text-primary mb-1">{benefit.title}</h4>
                <p className="text-sm text-text-muted">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

