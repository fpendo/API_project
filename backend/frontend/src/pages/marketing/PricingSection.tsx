import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const freeUsers = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
      </svg>
    ),
    title: 'Landowners',
    description: 'Mint credits for your mitigation schemes at zero cost',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Regulators',
    description: 'Full access to review, approve, and monitor all schemes',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    title: 'Planning Authorities',
    description: 'Validate and discharge conditions with no fees',
  },
]

const platformTiers = [
  {
    name: 'API Access',
    price: '0.3%',
    period: 'per transaction',
    description: 'For brokers and consultants',
    features: [
      'Full Registry API access',
      'Credit lookup & verification',
      'Transaction submission',
      'Webhook notifications',
      'Standard support',
    ],
    cta: 'Get API Key',
    highlighted: false,
  },
  {
    name: 'Marketplace',
    price: '0.5%',
    period: 'per transaction',
    description: 'For exchanges and trading platforms',
    features: [
      'Everything in API Access',
      'White-label trading UI',
      'Order book integration',
      'Settlement infrastructure',
      'Priority support',
      'Custom webhooks',
    ],
    cta: 'Partner With Us',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'volume-based',
    description: 'For large-scale operators',
    features: [
      'Custom fee structure',
      'Dedicated infrastructure',
      'SLA guarantees',
      'Co-development',
      'On-premise option',
      'Revenue share models',
    ],
    cta: 'Contact Us',
    highlighted: false,
  },
]

export default function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} id="pricing" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Dark background */}
      <div className="absolute inset-0 bg-background-deep" />
      
      {/* Gradient accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-accent-primary/10 to-transparent blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-accent-primary text-sm font-semibold uppercase tracking-widest">Pricing Model</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mt-4 mb-6">
            Free for Supply. Fees on Transactions.
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            We charge transaction fees only when credits are purchased. 
            Registration and minting are always free.
          </p>
        </motion.div>

        {/* Free tier users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-20"
        >
          <h3 className="text-center text-lg font-semibold text-text-muted uppercase tracking-widest mb-8">
            Always Free
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {freeUsers.map((user, index) => (
              <motion.div
                key={user.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20"
              >
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  {user.icon}
                </div>
                <h4 className="text-lg font-bold text-text-primary mb-2">{user.title}</h4>
                <p className="text-sm text-text-secondary">{user.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
                  <span className="text-xs font-semibold text-emerald-400">£0 Forever</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Platform/API pricing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h3 className="text-center text-lg font-semibold text-text-muted uppercase tracking-widest mb-8">
            For Platforms & Partners
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {platformTiers.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-accent-primary/20 to-background-surface border-2 border-accent-primary/50 shadow-glow'
                    : 'bg-background-surface/50 border border-border'
                }`}
              >
                {/* Popular badge */}
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent-primary text-background-deep text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                )}

                {/* Plan header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-text-primary mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-text-primary">{plan.price}</span>
                    {plan.period && <span className="text-text-muted text-sm">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-text-muted mt-2">{plan.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-accent-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text-secondary text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-accent-primary to-emerald-400 text-background-deep hover:shadow-glow'
                      : 'bg-background-elevated border border-border text-text-primary hover:border-accent-primary/50'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How fees work */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-8 p-6 rounded-xl bg-background-surface/50 border border-border">
            <div className="text-center sm:text-left">
              <p className="text-text-muted text-sm">Transaction Fee Example</p>
              <p className="text-lg text-text-primary">
                Developer buys 100 credits @ £40/credit = <span className="text-accent-primary font-bold">£4,000</span>
              </p>
            </div>
            <div className="hidden sm:block w-px h-12 bg-border" />
            <div className="text-center sm:text-left">
              <p className="text-text-muted text-sm">Platform Fee (0.5%)</p>
              <p className="text-lg text-text-primary">
                Fee = <span className="text-accent-primary font-bold">£20</span> (paid by developer)
              </p>
            </div>
          </div>
          <p className="text-text-muted text-sm mt-6">
            Landowners receive 100% of the sale price. Fees are transparent and only charged on successful transactions.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
