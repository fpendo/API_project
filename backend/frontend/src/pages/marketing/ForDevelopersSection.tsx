import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const features = [
  'Browse available credits by catchment',
  'Transparent pricing with 0.3-0.5% transaction fee',
  'Purchase and receive blockchain certificates',
  'Instant settlement and credit transfer',
  'QR-verified proof for planning officers',
]

export default function ForDevelopersSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Accent gradient */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/5 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Screenshot - left side on desktop */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative order-2 lg:order-1"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-3xl opacity-50" />
            
            {/* Screenshot placeholder */}
            <div className="relative rounded-2xl overflow-hidden border border-blue-500/20 shadow-2xl">
              <div className="aspect-[4/3] bg-gradient-to-br from-background-surface to-background-elevated">
                {/* Mock Exchange UI */}
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <span className="text-xl">🏗️</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text-primary">Solent - Nitrate</div>
                        <div className="text-xs text-text-muted">Live Orderbook</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-accent-primary">£2,450</div>
                      <div className="text-xs text-text-muted">per kg/N/year</div>
                    </div>
                  </div>

                  {/* Orderbook */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Bids */}
                    <div>
                      <div className="text-xs text-text-muted mb-2">BIDS</div>
                      <div className="space-y-1">
                        {[
                          { price: '2,420', qty: '150' },
                          { price: '2,400', qty: '300' },
                          { price: '2,380', qty: '450' },
                        ].map((bid, i) => (
                          <div key={i} className="flex justify-between text-xs p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-emerald-400">£{bid.price}</span>
                            <span className="text-text-muted">{bid.qty} kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Asks */}
                    <div>
                      <div className="text-xs text-text-muted mb-2">OFFERS</div>
                      <div className="space-y-1">
                        {[
                          { price: '2,450', qty: '100' },
                          { price: '2,480', qty: '250' },
                          { price: '2,500', qty: '400' },
                        ].map((ask, i) => (
                          <div key={i} className="flex justify-between text-xs p-2 rounded bg-red-500/10 border border-red-500/20">
                            <span className="text-red-400">£{ask.price}</span>
                            <span className="text-text-muted">{ask.qty} kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Buy form */}
                  <div className="p-4 rounded-lg bg-background-elevated/50 border border-border/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1">
                        <div className="text-xs text-text-muted mb-1">Amount</div>
                        <div className="h-8 bg-background-surface rounded border border-border flex items-center px-3">
                          <span className="text-sm text-text-primary">50</span>
                          <span className="text-sm text-text-muted ml-1">kg</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-text-muted mb-1">Total</div>
                        <div className="h-8 bg-background-surface rounded border border-border flex items-center px-3">
                          <span className="text-sm font-bold text-text-primary">£122,500</span>
                        </div>
                      </div>
                    </div>
                    <button className="w-full py-2 rounded-lg bg-gradient-to-r from-accent-primary to-emerald-400 text-background-deep font-semibold text-sm">
                      Buy Credits
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-deep to-transparent">
                <p className="text-center text-sm text-text-muted">Developer Exchange View</p>
              </div>
            </div>
          </motion.div>

          {/* Content - right side on desktop */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-4">
              For Developers
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-6">
              Buy Credits. Unblock Projects.<br />
              <span className="text-blue-400">Minutes, Not Months.</span>
            </h2>
            <p className="text-lg text-text-secondary mb-8">
              Property developers get instant access to verified credits across all catchments. 
              Transparent pricing, instant settlement, and blockchain-verified certificates.
            </p>

            {/* Feature list */}
            <ul className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.li
                  key={feature}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-text-secondary">{feature}</span>
                </motion.li>
              ))}
            </ul>

            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold rounded-lg transition-colors"
            >
              Start Buying Credits
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

