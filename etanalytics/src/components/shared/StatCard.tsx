/**
 * StatCard Component
 * Reusable statistics card with icon, value, and label
 */
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  iconColor?: string
  trend?: {
    value: number
    label: string
  }
  subtitle?: string
  variant?: 'default' | 'primary' | 'accent' | 'warning'
  className?: string
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  iconColor = 'text-primary-400',
  trend,
  subtitle,
  variant = 'default',
  className = ''
}: StatCardProps) => {
  const variantStyles = {
    default: 'card-glass',
    primary: 'bg-primary-500/10 border border-primary-500/20',
    accent: 'bg-accent-500/10 border border-accent-500/20',
    warning: 'bg-yellow-500/10 border border-yellow-500/20'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${variantStyles[variant]} rounded-xl p-6 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">{value}</p>
            {trend && (
              <span className={`flex items-center gap-1 text-sm ${
                trend.value >= 0 ? 'text-accent-400' : 'text-red-400'
              }`}>
                {trend.value >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend?.label && (
            <p className="text-xs text-gray-500 mt-0.5">{trend.label}</p>
          )}
        </div>
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center">
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default StatCard



