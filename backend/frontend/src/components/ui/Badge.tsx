import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'pending' | 'approved' | 'rejected' | 'locked'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-background-elevated text-text-secondary',
  neutral: 'bg-background-elevated text-text-muted border border-border',
  primary: 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30',
  success: 'bg-status-success/15 text-status-success border border-status-success/30',
  warning: 'bg-status-warning/15 text-status-warning border border-status-warning/30',
  error: 'bg-status-error/15 text-status-error border border-status-error/30',
  info: 'bg-status-info/15 text-status-info border border-status-info/30',
  pending: 'bg-status-pending/15 text-status-pending border border-status-pending/30',
  approved: 'bg-status-approved/15 text-status-approved border border-status-approved/30',
  rejected: 'bg-status-rejected/15 text-status-rejected border border-status-rejected/30',
  locked: 'bg-status-locked/15 text-status-locked border border-status-locked/30',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-muted',
  neutral: 'bg-text-muted',
  primary: 'bg-accent-primary',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  error: 'bg-status-error',
  info: 'bg-status-info',
  pending: 'bg-status-pending',
  approved: 'bg-status-approved',
  rejected: 'bg-status-rejected',
  locked: 'bg-status-locked',
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    const sizes = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-xs px-2.5 py-1',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium rounded-md',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[variant])} />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// Helper to map status strings to badge variants
export function getStatusVariant(status: string): BadgeVariant {
  const statusMap: Record<string, BadgeVariant> = {
    PENDING: 'pending',
    PENDING_REVIEW: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    LOCKED: 'locked',
    SUCCESS: 'success',
    ERROR: 'error',
    ACTIVE: 'success',
    INACTIVE: 'default',
    OPEN: 'info',
    CLOSED: 'default',
    FILLED: 'success',
    CANCELLED: 'error',
    PARTIALLY_FILLED: 'warning',
  }
  return statusMap[status.toUpperCase()] || 'default'
}

export { Badge, type BadgeProps, type BadgeVariant }

