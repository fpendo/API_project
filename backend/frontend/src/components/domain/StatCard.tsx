import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn, formatGBP, formatCredits, formatTonnage } from '../../lib/utils'

type StatFormat = 'number' | 'currency' | 'credits' | 'tonnage' | 'percentage' | 'raw'

interface StatCardProps {
  label: string
  value: number | string
  format?: StatFormat
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
}

const variants = {
  default: 'border-border',
  primary: 'border-accent-primary/30 bg-accent-primary/5',
  success: 'border-status-success/30 bg-status-success/5',
  warning: 'border-status-warning/30 bg-status-warning/5',
  error: 'border-status-error/30 bg-status-error/5',
  info: 'border-status-info/30 bg-status-info/5',
}

const variantTextColors = {
  default: 'text-text-primary',
  primary: 'text-accent-primary',
  success: 'text-status-success',
  warning: 'text-status-warning',
  error: 'text-status-error',
  info: 'text-status-info',
}

function formatValue(value: number | string, format: StatFormat): string {
  if (typeof value === 'string') return value
  
  switch (format) {
    case 'currency':
      return formatGBP(value)
    case 'credits':
      return formatCredits(value)
    case 'tonnage':
      return formatTonnage(value)
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'number':
      return value.toLocaleString()
    case 'raw':
    default:
      return String(value)
  }
}

export function StatCard({
  label,
  value,
  format = 'number',
  icon,
  trend,
  subtitle,
  className,
  size = 'md',
  variant = 'default',
}: StatCardProps) {
  const sizes = {
    sm: { padding: 'p-4', value: 'text-xl sm:text-2xl', label: 'text-xs' },
    md: { padding: 'p-4 sm:p-6', value: 'text-xl sm:text-2xl lg:text-3xl', label: 'text-sm' },
    lg: { padding: 'p-4 sm:p-6 lg:p-8', value: 'text-xl sm:text-2xl lg:text-3xl xl:text-4xl', label: 'text-sm lg:text-base' },
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'rounded-xl border bg-background-surface',
        sizes[size].padding,
        variants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cn(
          'uppercase tracking-wider font-medium text-text-muted',
          sizes[size].label
        )}>
          {label}
        </span>
        {icon && (
          <span className="text-text-muted">{icon}</span>
        )}
      </div>

      <div className={cn(
        'font-mono font-bold mt-2 tracking-tight break-words overflow-hidden',
        sizes[size].value,
        variantTextColors[variant]
      )}>
        {formatValue(value, format)}
      </div>

      {(trend || subtitle) && (
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <span className={cn(
              'text-sm font-medium flex items-center gap-0.5',
              trend.isPositive ? 'text-status-success' : 'text-status-error'
            )}>
              {trend.isPositive ? '↑' : '↓'}
              {Math.abs(trend.value)}%
            </span>
          )}
          {subtitle && (
            <span className="text-sm text-text-muted">{subtitle}</span>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Grid wrapper for multiple stat cards
interface StatsGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4 | 5
  className?: string
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
  }

  return (
    <div className={cn('grid grid-cols-1 gap-4', cols[columns], className)}>
      {children}
    </div>
  )
}

