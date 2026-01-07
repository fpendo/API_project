import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'pilot',
    description: 'Perfect for evaluating the platform',
    features: [
      '1 catchment',
      '100 API calls/month',
      'Email support',
      'Sandbox environment',
      'Basic documentation',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '£499',
    period: '/month',
    description: 'For active traders and developers',
    features: [
      '5 catchments',
      '10,000 API calls/month',
      'Webhooks included',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
    ],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For regulators and large organizations',
    features: [
      'Unlimited catchments',
      'Unlimited API calls',
      'Dedicated support',
      'SLA guarantee',
      'On-premise option',
      'White-label available',
      'Custom development',
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
          <span className="text-accent-primary text-sm font-semibold uppercase tracking-widest">Pricing</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mt-4 mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Start free with our pilot program. Scale as you grow.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
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
                  {plan.period && <span className="text-text-muted">{plan.period}</span>}
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

        {/* Transaction fees note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center text-text-muted text-sm mt-12"
        >
          Transaction fees: 0.5% per credit traded. Volume discounts available for Enterprise plans.
        </motion.p>
      </div>
    </section>
  )
}

