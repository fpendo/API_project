import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

// Animated counter component
function AnimatedCounter({ value, suffix = '', duration = 2 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    
    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1)
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * value))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [isInView, value, duration])

  return (
    <span ref={ref} className="font-mono">
      {count.toLocaleString()}{suffix}
    </span>
  )
}

const stats = [
  { value: 120000, suffix: '', label: 'Homes Blocked', description: 'planning applications stalled' },
  { value: 2.1, suffix: 'B', label: 'Stalled Value', description: 'in development projects' },
  { value: 18, suffix: ' mo', label: 'Average Delay', description: 'to achieve neutrality' },
]

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Dark background with subtle pattern */}
      <div className="absolute inset-0 bg-background-deep">
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-accent-primary text-sm font-semibold uppercase tracking-widest">The Challenge</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mt-4 mb-6">
            The Nutrient Neutrality Crisis
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Since 2022, development in protected catchments has ground to a halt. 
            The current system is manual, fragmented, and painfully slow.
          </p>
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="text-center p-8 rounded-2xl bg-background-surface/30 border border-border/50 backdrop-blur-sm"
            >
              <div className="text-5xl lg:text-6xl font-bold text-text-primary mb-2">
                {stat.suffix === 'B' ? (
                  <span className="font-mono">£<AnimatedCounter value={stat.value * 10} suffix="" duration={2} /><span className="text-accent-primary">B</span></span>
                ) : (
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={2} />
                )}
              </div>
              <div className="text-lg font-semibold text-text-secondary mb-1">{stat.label}</div>
              <div className="text-sm text-text-muted">{stat.description}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Problem visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative"
        >
          <div className="p-8 lg:p-12 rounded-2xl bg-background-surface/20 border border-status-error/20">
            <h3 className="text-2xl font-bold text-text-primary mb-8 text-center">The Broken Process</h3>
            
            {/* Process flow */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-2">
              {[
                { icon: '🏗️', label: 'Developer', desc: 'Needs credits' },
                { icon: '→', label: '', desc: '', isArrow: true },
                { icon: '📄', label: 'Paper Forms', desc: 'Manual applications' },
                { icon: '→', label: '', desc: '', isArrow: true },
                { icon: '⚖️', label: 'Regulator', desc: 'Manual review' },
                { icon: '→', label: '', desc: '', isArrow: true },
                { icon: '⏳', label: 'Months', desc: 'Of waiting' },
                { icon: '→', label: '', desc: '', isArrow: true },
                { icon: '❓', label: 'Maybe', desc: 'Approval' },
              ].map((step, index) => (
                step.isArrow ? (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                    className="text-2xl text-status-error/50 hidden lg:block"
                  >
                    →
                  </motion.div>
                ) : (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                    className="flex-1 min-w-[100px] max-w-[140px] text-center p-4 rounded-xl bg-background-elevated/50 border border-status-error/10"
                  >
                    <span className="text-3xl">{step.icon}</span>
                    <div className="text-sm font-semibold text-text-primary mt-2">{step.label}</div>
                    <div className="text-xs text-text-muted">{step.desc}</div>
                  </motion.div>
                )
              ))}
            </div>

            {/* Quote */}
            <motion.blockquote
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="mt-12 text-center"
            >
              <p className="text-lg italic text-text-secondary max-w-2xl mx-auto">
                "Every planning application in affected catchments requires nutrient neutrality. 
                Without a solution, housing delivery will remain paralyzed."
              </p>
              <cite className="block mt-4 text-sm text-text-muted not-italic">
                — Home Builders Federation, 2024
              </cite>
            </motion.blockquote>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

