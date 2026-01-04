import { motion } from 'framer-motion'

export default function AnimatedExchangeDemo() {
  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Glow effect behind screenshot */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-accent-primary/30 via-cyan-500/20 to-accent-secondary/30 blur-3xl"
        animate={{
          opacity: [0.4, 0.6, 0.4],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Main container with floating animation */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="relative"
      >
        {/* Subtle floating effect */}
        <motion.div
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Browser frame */}
          <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl bg-background-surface">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 h-10 bg-background-elevated/80 backdrop-blur-sm border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-6 bg-background-surface rounded-md flex items-center px-3 max-w-xs">
                  <svg className="w-3 h-3 text-text-disabled mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs text-text-disabled">app.nemx.io/exchange</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-background-surface/50 flex items-center justify-center">
                  <svg className="w-3 h-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Screenshot with zoom, crop, and scroll animation */}
            <div className="relative overflow-hidden h-[420px]">
              <motion.img
                src="/screenshots/exchange.png"
                alt="NEMX Exchange Platform"
                className="absolute w-[180%] max-w-none left-1/2 -translate-x-1/2"
                animate={{
                  top: ['0%', '-35%', '-35%', '0%', '0%'],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [0, 0.35, 0.5, 0.85, 1], // scroll down, pause, scroll up, pause
                }}
              />
              
              {/* Subtle gradient overlay at edges */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background-deep/80 to-transparent pointer-events-none z-10" />
              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background-surface/60 to-transparent pointer-events-none z-10" />
            </div>
          </div>
          
          {/* Reflection effect */}
          <div className="absolute -bottom-4 left-4 right-4 h-8 bg-gradient-to-b from-accent-primary/10 to-transparent blur-xl rounded-full" />
        </motion.div>
      </motion.div>
      
      {/* Live indicator */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute -top-2 -right-2 flex items-center gap-2 px-3 py-1.5 bg-background-surface border border-border rounded-full shadow-lg z-10"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-primary"></span>
        </span>
        <span className="text-xs font-medium text-text-secondary">Live Demo</span>
      </motion.div>
    </div>
  )
}

