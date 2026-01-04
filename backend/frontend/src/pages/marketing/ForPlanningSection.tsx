import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const features = [
  'Instant QR verification of credit ownership',
  'One-click credit burn on planning approval',
  'Immutable proof for audit',
  'Integration with planning portals',
]

export default function ForPlanningSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Accent gradient */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-cyan-500/5 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-medium mb-4">
              For Planning Authorities
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-6">
              Verify Instantly.<br />
              <span className="text-cyan-400">Approve Confidently.</span>
            </h2>
            <p className="text-lg text-text-secondary mb-8">
              Planning officers can verify credit ownership in seconds with QR codes. 
              One-click burn ensures credits are permanently retired on approval.
            </p>

            {/* Process flow */}
            <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-background-surface/30 border border-cyan-500/20">
              <div className="text-center">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-2 mx-auto">
                  <span className="text-xl">📱</span>
                </div>
                <span className="text-xs text-text-muted">Scan</span>
              </div>
              <svg className="w-6 h-6 text-cyan-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="text-center">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-2 mx-auto">
                  <span className="text-xl">✓</span>
                </div>
                <span className="text-xs text-text-muted">Verify</span>
              </div>
              <svg className="w-6 h-6 text-cyan-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="text-center">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-2 mx-auto">
                  <span className="text-xl">🔥</span>
                </div>
                <span className="text-xs text-text-muted">Burn</span>
              </div>
              <svg className="w-6 h-6 text-cyan-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="text-center">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2 mx-auto">
                  <span className="text-xl">✅</span>
                </div>
                <span className="text-xs text-text-muted">Approve</span>
              </div>
            </div>

            <p className="text-sm text-text-muted mb-8 italic">
              30 seconds. Fully auditable. Blockchain-verified.
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
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-text-secondary">{feature}</span>
                </motion.li>
              ))}
            </ul>

            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold rounded-lg transition-colors"
            >
              Request Planning Demo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </motion.div>

          {/* Screenshot with QR focus */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-3xl opacity-50" />
            
            {/* Screenshot placeholder */}
            <div className="relative rounded-2xl overflow-hidden border border-cyan-500/20 shadow-2xl">
              <div className="aspect-[4/3] bg-gradient-to-br from-background-surface to-background-elevated">
                {/* Mock Planning UI */}
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <span className="text-xl">📋</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">Application #PA-2026-0142</div>
                      <div className="text-xs text-text-muted">Verified Credit Proof</div>
                    </div>
                  </div>

                  {/* QR Code display */}
                  <div className="flex items-center gap-6 p-4 rounded-xl bg-background-elevated/50 border border-cyan-500/20 mb-4">
                    {/* QR Code placeholder */}
                    <div className="w-24 h-24 rounded-lg bg-white p-2 flex-shrink-0">
                      <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-0.5">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div
                            key={i}
                            className={`${
                              [0, 1, 2, 4, 5, 6, 10, 14, 15, 16, 18, 19, 20, 22, 24].includes(i)
                                ? 'bg-background-deep'
                                : 'bg-white'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Verification details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400 font-semibold text-sm">Verified</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Credits:</span>
                          <span className="text-text-primary font-mono">85 kg N</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Owner:</span>
                          <span className="text-text-primary">DevCo Properties</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Catchment:</span>
                          <span className="text-text-primary">Solent</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button className="py-3 rounded-lg bg-status-error/20 text-status-error font-semibold text-sm border border-status-error/30">
                      🔥 Burn Credits
                    </button>
                    <button className="py-3 rounded-lg bg-emerald-500/20 text-emerald-400 font-semibold text-sm border border-emerald-500/30">
                      ✅ Approve
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-deep to-transparent">
                <p className="text-center text-sm text-text-muted">Planning Officer Verification</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

