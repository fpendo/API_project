import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const features = [
  'Review and approve mitigation schemes',
  'Track nutrient credits across all catchments',
  'Immutable audit trail on blockchain',
  'Real-time capacity monitoring',
  'API integration with existing systems',
]

export default function ForRegulatorsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Dark background */}
      <div className="absolute inset-0 bg-background-deep" />
      
      {/* Accent gradient */}
      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-emerald-500/5 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4">
              For Regulators
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-6">
              Complete Oversight.<br />
              <span className="gradient-text">Automated Compliance.</span>
            </h2>
            <p className="text-lg text-text-secondary mb-8">
              Natural England and Environment Agency teams get a unified dashboard 
              to review, approve, and monitor all mitigation activity across catchments.
            </p>

            {/* Feature list */}
            <ul className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.li
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-primary/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-accent-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-text-secondary">{feature}</span>
                </motion.li>
              ))}
            </ul>

            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold rounded-lg transition-colors"
            >
              Request Regulator Demo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </motion.div>

          {/* Screenshot */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 blur-3xl opacity-50" />
            
            {/* Actual Screenshot */}
            <div className="relative rounded-2xl overflow-hidden border border-emerald-500/20 shadow-2xl">
              {/* Browser chrome mockup */}
              <div className="bg-background-elevated/80 backdrop-blur-sm flex items-center px-4 py-3 gap-2 border-b border-border/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-6 bg-background-surface rounded-md flex items-center px-3">
                    <span className="text-xs text-text-disabled">app.nemx.io/regulator</span>
                  </div>
                </div>
              </div>
              
              {/* Screenshot image */}
              <img 
                src="/screenshots/regulator_dashboard.png" 
                alt="NEMX Regulator Dashboard showing capacity analytics, approved schemes, and catchment data"
                className="w-full h-auto"
                style={{ imageRendering: 'auto', maxWidth: '100%' }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

