import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'

const steps = [
  {
    number: 1,
    icon: '🌾',
    title: 'Landowner Submits Scheme',
    description: 'Landowner submits mitigation scheme with land details, environmental improvements, and credit calculations.',
    details: [
      'Upload land boundaries and parcel data',
      'Specify mitigation type (wetland, buffer strips, etc.)',
      'Calculate projected nutrient reduction',
    ],
    color: 'emerald',
  },
  {
    number: 2,
    icon: '✓',
    title: 'Regulator Approves',
    description: 'Natural England reviews submission, verifies calculations, and approves the scheme. Credits are minted on-chain.',
    details: [
      'Review environmental impact assessment',
      'Verify nutrient calculations',
      'Mint digital certificates (ERC-1155)',
    ],
    color: 'blue',
  },
  {
    number: 3,
    icon: '💰',
    title: 'Credits Minted',
    description: 'Verified credits are minted as blockchain tokens and transferred to the landowner or their broker.',
    details: [
      'Credits appear in landowner wallet',
      'Transfer to broker for trading',
      'List on exchange at desired price',
    ],
    color: 'purple',
  },
  {
    number: 4,
    icon: '🏗️',
    title: 'Developer Purchases',
    description: 'Property developers browse available credits by catchment and purchase the required amount for their project.',
    details: [
      'Search by catchment and unit type',
      'View transparent orderbook pricing',
      'Instant settlement and certificate transfer',
    ],
    color: 'amber',
  },
  {
    number: 5,
    icon: '📋',
    title: 'Planning Burns & Approves',
    description: 'Planning officer scans QR code to verify ownership, burns credits permanently, and approves the application.',
    details: [
      'Scan QR code for instant verification',
      'One-click burn to retire credits',
      'Immutable record for audit trail',
    ],
    color: 'cyan',
  },
]

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [activeStep, setActiveStep] = useState(0)

  return (
    <section ref={sectionRef} id="how-it-works" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-accent-primary text-sm font-semibold uppercase tracking-widest">Process</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mt-4 mb-6">
            From Land to Planning Approval
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            A complete end-to-end workflow that transforms environmental land improvements 
            into verified, tradeable credits.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Desktop timeline line */}
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-0.5 bg-border">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 via-purple-500 to-cyan-500"
              initial={{ width: '0%' }}
              animate={isInView ? { width: '100%' } : {}}
              transition={{ duration: 2, delay: 0.5 }}
            />
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
                className="relative"
              >
                {/* Step indicator */}
                <div 
                  className={`relative z-10 mx-auto lg:mx-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl cursor-pointer transition-all ${
                    activeStep === index 
                      ? `bg-${step.color}-500 shadow-lg shadow-${step.color}-500/30` 
                      : 'bg-background-surface border border-border hover:border-accent-primary/50'
                  }`}
                  onClick={() => setActiveStep(index)}
                >
                  {step.icon}
                </div>

                {/* Content */}
                <div className="mt-6 text-center lg:text-left">
                  <h3 className="font-semibold text-text-primary mb-2">{step.title}</h3>
                  <p className="text-sm text-text-muted mb-4">{step.description}</p>
                  
                  {/* Expandable details on click */}
                  <motion.div
                    initial={false}
                    animate={{ 
                      height: activeStep === index ? 'auto' : 0,
                      opacity: activeStep === index ? 1 : 0
                    }}
                    className="overflow-hidden"
                  >
                    <ul className="space-y-2 text-left">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-text-muted">
                          <span className={`text-${step.color}-400 mt-0.5`}>→</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </div>

                {/* Mobile connector */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center my-4">
                    <svg className="w-6 h-6 text-text-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { value: '< 24h', label: 'Scheme Approval', desc: 'vs 6+ months traditional' },
            { value: '30 sec', label: 'QR Verification', desc: 'instant credit validation' },
            { value: '100%', label: 'Audit Trail', desc: 'blockchain-verified' },
          ].map((stat, index) => (
            <div key={stat.label} className="text-center p-6 rounded-xl bg-background-surface/30 border border-border/50">
              <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="font-semibold text-text-primary">{stat.label}</div>
              <div className="text-sm text-text-muted">{stat.desc}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

