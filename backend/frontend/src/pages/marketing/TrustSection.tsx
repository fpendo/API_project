import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const certifications = [
  { name: 'GDPR Compliant', icon: '🛡️' },
  { name: 'ISO 27001', icon: '✓' },
  { name: 'Cyber Essentials+', icon: '🔒' },
  { name: 'Open Banking', icon: '🏦' },
]

const catchments = [
  { name: 'Solent', region: 'Hampshire, Isle of Wight', status: 'live' },
  { name: 'Stour', region: 'Dorset', status: 'live' },
  { name: 'Somerset Levels', region: 'Somerset', status: 'live' },
  { name: 'Severn', region: 'West Midlands', status: 'live' },
  { name: 'Humber', region: 'Yorkshire', status: 'live' },
  { name: 'Teifi', region: 'Wales', status: 'coming' },
  { name: 'Poole Harbour', region: 'Dorset', status: 'coming' },
]

export default function TrustSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
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
          <span className="text-accent-primary text-sm font-semibold uppercase tracking-widest">Trust & Compliance</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mt-4 mb-6">
            Built for Government. <span className="gradient-text">Secured for Enterprise.</span>
          </h2>
        </motion.div>

        {/* Certifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-4 mb-16"
        >
          {certifications.map((cert) => (
            <div
              key={cert.name}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-background-surface/50 border border-border"
            >
              <span className="text-xl">{cert.icon}</span>
              <span className="text-text-secondary font-medium">{cert.name}</span>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="p-8 rounded-2xl bg-background-surface/30 border border-border">
              <svg className="w-10 h-10 text-accent-primary/30 mb-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <blockquote className="text-xl text-text-primary mb-6 leading-relaxed">
                "Building our marketplace on this registry infrastructure saved us 18 months 
                of development. The API handles all the complexity of credit verification, 
                settlement, and regulatory compliance out of the box."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center">
                  <span className="text-xl">🏢</span>
                </div>
                <div>
                  <div className="font-semibold text-text-primary">Platform Partner</div>
                  <div className="text-sm text-text-muted">Environmental Exchange Operator</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Catchments map */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-xl font-bold text-text-primary mb-6">Supported Catchments</h3>
            
            {/* UK outline placeholder with catchment markers */}
            <div className="relative p-6 rounded-2xl bg-background-surface/30 border border-border mb-6">
              <div className="aspect-[4/5] relative">
                {/* Simple UK outline */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 250" fill="none">
                  <path
                    d="M100 20 L120 40 L130 80 L140 100 L135 120 L145 140 L140 160 L150 180 L145 200 L130 220 L110 230 L90 225 L70 210 L60 190 L55 170 L50 150 L55 130 L45 110 L50 90 L60 70 L80 50 L100 20"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-border"
                    fill="none"
                  />
                  
                  {/* Catchment markers */}
                  <circle cx="130" cy="200" r="6" className="fill-accent-primary" /> {/* Solent */}
                  <circle cx="120" cy="190" r="6" className="fill-accent-primary" /> {/* Stour */}
                  <circle cx="100" cy="175" r="6" className="fill-accent-primary" /> {/* Somerset */}
                  <circle cx="95" cy="145" r="6" className="fill-accent-primary" /> {/* Severn */}
                  <circle cx="115" cy="110" r="6" className="fill-accent-primary" /> {/* Humber */}
                  <circle cx="70" cy="160" r="6" className="fill-text-muted" /> {/* Teifi - coming */}
                  <circle cx="115" cy="195" r="6" className="fill-text-muted" /> {/* Poole */}
                </svg>
                
                {/* Legend */}
                <div className="absolute bottom-0 left-0 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-accent-primary" />
                    <span className="text-text-muted">Live</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-text-muted" />
                    <span className="text-text-muted">Coming Soon</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Catchment list */}
            <div className="grid grid-cols-2 gap-2">
              {catchments.map((catchment) => (
                <div
                  key={catchment.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-background-surface/20 border border-border/50"
                >
                  <div>
                    <div className="text-sm font-medium text-text-primary">{catchment.name}</div>
                    <div className="text-xs text-text-muted">{catchment.region}</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      catchment.status === 'live'
                        ? 'bg-accent-primary/20 text-accent-primary'
                        : 'bg-text-muted/20 text-text-muted'
                    }`}
                  >
                    {catchment.status === 'live' ? 'Live' : 'Soon'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

