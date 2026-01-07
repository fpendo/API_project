import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated topographic background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background-deep via-background to-background-deep" />
        
        {/* Topographic pattern overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="topo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 0 Q75 25 50 50 T50 100" stroke="currentColor" fill="none" strokeWidth="0.5"/>
              <path d="M0 50 Q25 25 50 50 T100 50" stroke="currentColor" fill="none" strokeWidth="0.5"/>
              <circle cx="50" cy="50" r="30" stroke="currentColor" fill="none" strokeWidth="0.5"/>
              <circle cx="50" cy="50" r="45" stroke="currentColor" fill="none" strokeWidth="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo)" className="text-accent-primary"/>
        </svg>

        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-emerald-500/20 to-transparent blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -30, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-500/15 to-transparent blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.08, 0.15, 0.08],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 blur-3xl"
        />

        {/* Flowing lines */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <motion.path
            d="M-100,400 Q200,350 400,400 T800,350 T1200,400 T1600,350 T2000,400"
            stroke="url(#line-gradient)"
            strokeWidth="1"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{ duration: 3, delay: 0.5 }}
          />
          <motion.path
            d="M-100,450 Q200,500 400,450 T800,500 T1200,450 T1600,500 T2000,450"
            stroke="url(#line-gradient)"
            strokeWidth="0.5"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.2 }}
            transition={{ duration: 3, delay: 0.8 }}
          />
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-20">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-primary/10 border border-accent-primary/20 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            <span className="text-sm text-accent-primary font-medium">Now live in 5 UK catchments</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            <span className="text-text-primary">The Infrastructure for</span>
            <br />
            <span className="gradient-text">Nature Recovery</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl lg:text-2xl text-text-secondary max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            The complete platform for nutrient credit trading, environmental mitigation, 
            and regulatory compliance. Built for regulators. Trusted by developers.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <a
              href="#contact"
              className="group px-8 py-4 bg-gradient-to-r from-accent-primary to-emerald-400 text-background-deep font-semibold rounded-xl hover:shadow-glow-lg transition-all text-lg flex items-center gap-2"
            >
              Request Demo
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a
              href="#docs"
              className="px-8 py-4 bg-background-surface/50 backdrop-blur-sm border border-border text-text-primary font-semibold rounded-xl hover:bg-background-surface hover:border-border-focus transition-all text-lg"
            >
              View Documentation
            </a>
          </motion.div>

          {/* Product screenshot */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative max-w-5xl mx-auto"
          >
            {/* Glow effect behind screenshot */}
            <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 via-transparent to-accent-secondary/20 blur-3xl" />
            
            {/* Screenshot placeholder - replace with actual screenshot */}
            <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl bg-background-surface">
              <div className="aspect-[16/9] bg-gradient-to-br from-background-surface to-background-elevated flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                    <span className="text-3xl font-bold text-background-deep">NX</span>
                  </div>
                  <p className="text-text-muted text-lg">Exchange Dashboard Screenshot</p>
                  <p className="text-text-disabled text-sm mt-2">Replace with actual product screenshot</p>
                </div>
              </div>
              
              {/* Browser chrome mockup */}
              <div className="absolute top-0 left-0 right-0 h-10 bg-background-elevated/50 backdrop-blur-sm flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-6 bg-background-surface rounded-md flex items-center px-3">
                    <span className="text-xs text-text-disabled">app.nemx.io/exchange</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-16"
          >
            <p className="text-text-disabled text-sm uppercase tracking-widest mb-6">Trusted by</p>
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12 opacity-60">
              {/* Placeholder logos - replace with actual client logos */}
              {['Natural England', 'Environment Agency', 'Planning Authorities'].map((name) => (
                <div key={name} className="px-6 py-3 rounded-lg bg-background-surface/30 border border-border/30">
                  <span className="text-text-muted text-sm font-medium">{name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-text-muted/30 flex items-start justify-center p-2"
        >
          <motion.div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
        </motion.div>
      </motion.div>
    </section>
  )
}

