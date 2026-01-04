import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { TopBar } from './TopBar'
import { cn } from '../../lib/utils'

interface AppShellProps {
  children: ReactNode
  title?: string
  subtitle?: string
  showBack?: boolean
  actions?: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const maxWidths = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-[1400px]',
  full: 'max-w-full',
}

const paddings = {
  none: '',
  sm: 'px-4 py-4',
  md: 'px-6 py-6',
  lg: 'px-8 py-8',
}

export function AppShell({
  children,
  title,
  subtitle,
  showBack = true,
  actions,
  maxWidth = 'xl',
  padding = 'md',
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopBar showBack={showBack} />
      
      <main className={cn('mx-auto', maxWidths[maxWidth], paddings[padding])}>
        {/* Page Header */}
        {(title || actions) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              {title && (
                <h1 className="text-h1 font-heading font-bold text-text-primary">{title}</h1>
              )}
              {subtitle && (
                <p className="text-body text-text-muted mt-1">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
          </motion.div>
        )}

        {/* Page Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}

// Stats row component for dashboards
interface StatItem {
  label: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon?: ReactNode
}

interface StatsRowProps {
  stats: StatItem[]
}

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className={cn(
            'relative p-6 rounded-xl',
            'bg-background-surface border border-border',
            'overflow-hidden group'
          )}
        >
          {/* Subtle gradient background on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative">
            <div className="flex items-start justify-between">
              <p className="stat-label">{stat.label}</p>
              {stat.icon && (
                <span className="text-text-muted">{stat.icon}</span>
              )}
            </div>
            <p className="stat-value mt-2 text-text-primary">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </p>
            {stat.change && (
              <p className={cn(
                'text-sm mt-2 flex items-center gap-1',
                stat.change.type === 'increase' && 'text-status-success',
                stat.change.type === 'decrease' && 'text-status-error',
                stat.change.type === 'neutral' && 'text-text-muted'
              )}>
                {stat.change.type === 'increase' && '↑'}
                {stat.change.type === 'decrease' && '↓'}
                {stat.change.value}%
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Section divider with optional title
interface SectionProps {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Section({ title, description, action, children, className }: SectionProps) {
  return (
    <section className={cn('mb-8', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && <h2 className="text-h3 font-semibold text-text-primary">{title}</h2>}
            {description && <p className="text-body-sm text-text-muted mt-1">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

