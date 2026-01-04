import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

// Role configuration with icons and descriptions
const roles = [
  {
    name: 'Landowner',
    path: '/landowner',
    icon: '🌾',
    description: 'Submit offset schemes, manage credits, and track sales',
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    borderHover: 'group-hover:border-emerald-500/50',
  },
  {
    name: 'Regulator',
    path: '/regulator',
    icon: '⚖️',
    description: 'Review submissions, approve schemes, and monitor capacity',
    gradient: 'from-blue-500/20 to-blue-600/5',
    borderHover: 'group-hover:border-blue-500/50',
  },
  {
    name: 'Broker',
    path: '/broker',
    icon: '📊',
    description: 'Manage client portfolios and execute trades',
    gradient: 'from-purple-500/20 to-purple-600/5',
    borderHover: 'group-hover:border-purple-500/50',
  },
  {
    name: 'Developer',
    path: '/developer',
    icon: '🏗️',
    description: 'Purchase credits and generate planning QR codes',
    gradient: 'from-amber-500/20 to-amber-600/5',
    borderHover: 'group-hover:border-amber-500/50',
  },
  {
    name: 'Planning Officer',
    path: '/planning',
    icon: '📋',
    description: 'Validate applications, lock and burn credits',
    gradient: 'from-cyan-500/20 to-cyan-600/5',
    borderHover: 'group-hover:border-cyan-500/50',
  },
  {
    name: 'Operator',
    path: '/operator',
    icon: '⚙️',
    description: 'Manage exchange operations and OTC deals',
    gradient: 'from-rose-500/20 to-rose-600/5',
    borderHover: 'group-hover:border-rose-500/50',
  },
]

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.3,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
}

function Landing() {
  return (
    <div className="min-h-screen gradient-mesh flex flex-col">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-accent-primary/10 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-accent-secondary/10 blur-3xl"
        />
      </div>

      {/* Main content */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 mb-8 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary shadow-glow"
          >
            <span className="text-3xl font-bold text-background-deep">NX</span>
          </motion.div>

          {/* Title */}
          <h1 className="text-display font-heading font-bold mb-4">
            <span className="gradient-text">NEMX</span>
          </h1>
          <p className="text-h3 text-text-secondary font-light mb-2">
            National Environmental Mitigation Exchange
          </p>
          <p className="text-body text-text-muted max-w-xl mx-auto">
            The UK's premier platform for trading nitrate and phosphate offset credits.
            Transparent, secure, and blockchain-verified.
          </p>
        </motion.div>

        {/* Role selection */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-5xl"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-text-muted mb-8 uppercase tracking-widest text-sm"
          >
            Select your role to continue
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <motion.div key={role.path} variants={itemVariants}>
                <Link
                  to={role.path}
                  className={cn(
                    'group relative block p-6 rounded-xl',
                    'bg-background-surface/50 backdrop-blur-sm',
                    'border border-border transition-all duration-300',
                    role.borderHover,
                    'hover:bg-background-surface hover:shadow-elevated'
                  )}
                >
                  {/* Gradient overlay on hover */}
                  <div
                    className={cn(
                      'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                      `bg-gradient-to-br ${role.gradient}`
                    )}
                  />

                  {/* Content */}
                  <div className="relative">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{role.icon}</span>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-text-primary group-hover:text-white transition-colors">
                          {role.name}
                        </h3>
                        <p className="text-sm text-text-muted mt-1 group-hover:text-text-secondary transition-colors">
                          {role.description}
                        </p>
                      </div>
                      {/* Arrow */}
                      <motion.svg
                        className="w-5 h-5 text-text-muted group-hover:text-accent-primary transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        initial={false}
                        animate={{ x: 0 }}
                        whileHover={{ x: 4 }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </motion.svg>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative py-6 text-center">
        <p className="text-sm text-text-disabled">
          Powered by blockchain technology • Smart contracts on Polygon
        </p>
      </footer>
    </div>
  )
}

export default Landing
