import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const landownerFeatures = [
  'Submit mitigation schemes',
  'Receive verified credits',
  'Transfer to brokers',
  'Track sales & revenue',
]

const brokerFeatures = [
  'Manage client portfolios',
  'Automated ladder trading',
  'Real-time market access',
  'Commission management',
]

export default function ForLandownersSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Dark background */}
      <div className="absolute inset-0 bg-background-deep" />
      
      {/* Gradient accents */}
      <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-b from-purple-500/5 to-transparent" />
      <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-gradient-to-t from-amber-500/5 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium mb-4">
            For Landowners & Brokers
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-6">
            Monetize Land. <span className="text-purple-400">Automate Trading.</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Landowners create value from environmental improvements. 
            Brokers manage portfolios with automated trading strategies.
          </p>
        </motion.div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Landowner card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="p-8 rounded-2xl bg-background-surface/30 border border-amber-500/20 backdrop-blur-sm h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🌾</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">Landowners</h3>
                  <p className="text-sm text-text-muted">Create & sell credits</p>
                </div>
              </div>

              {/* Mock UI */}
              <div className="mb-6 p-4 rounded-xl bg-background-elevated/50 border border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-text-muted">Your Credits</span>
                  <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">Verified</span>
                </div>
                <div className="space-y-3">
                  {[
                    { scheme: 'Riverside Meadow', credits: '2,500 kg', value: '£6.1M' },
                    { scheme: 'Woodland Buffer', credits: '1,200 kg', value: '£2.9M' },
                  ].map((item) => (
                    <div key={item.scheme} className="flex items-center justify-between p-3 rounded-lg bg-background-surface/50">
                      <div>
                        <div className="text-sm font-medium text-text-primary">{item.scheme}</div>
                        <div className="text-xs text-text-muted">{item.credits}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-accent-primary">{item.value}</div>
                        <div className="text-xs text-text-muted">Est. value</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3">
                {landownerFeatures.map((feature, index) => (
                  <motion.li
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-text-secondary text-sm">{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Broker card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            <div className="p-8 rounded-2xl bg-background-surface/30 border border-purple-500/20 backdrop-blur-sm h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">Brokers</h3>
                  <p className="text-sm text-text-muted">Automated trading</p>
                </div>
              </div>

              {/* Mock UI - Ladder Bot */}
              <div className="mb-6 p-4 rounded-xl bg-background-elevated/50 border border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-text-muted">Ladder Bot - Solent</span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400">Active</span>
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { price: '£2,500', qty: '50 kg', status: 'Placed' },
                    { price: '£2,480', qty: '50 kg', status: 'Placed' },
                    { price: '£2,460', qty: '50 kg', status: 'Filled' },
                    { price: '£2,440', qty: '50 kg', status: 'Filled' },
                  ].map((order, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-background-surface/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-text-primary">{order.price}</span>
                        <span className="text-xs text-text-muted">{order.qty}</span>
                      </div>
                      <span className={`text-xs ${order.status === 'Filled' ? 'text-emerald-400' : 'text-text-muted'}`}>
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3">
                {brokerFeatures.map((feature, index) => (
                  <motion.li
                    key={feature}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-text-secondary text-sm">{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

