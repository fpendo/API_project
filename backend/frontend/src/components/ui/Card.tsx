import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass'
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, padding = 'md', children, onClick }, ref) => {
    const variantStyles = {
      default: 'bg-background-surface border border-border',
      elevated: 'bg-background-surface border border-border shadow-card',
      glass: 'bg-background-surface/60 backdrop-blur-md border border-border/50',
    }

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }

    if (hover) {
      return (
        <motion.div
          ref={ref}
          whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}
          transition={{ duration: 0.2 }}
          onClick={onClick}
          className={cn(
            'rounded-xl cursor-pointer transition-colors',
            variantStyles[variant],
            paddings[padding],
            className
          )}
        >
          {children}
        </motion.div>
      )
    }

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'rounded-xl',
          variantStyles[variant],
          paddings[padding],
          className
        )}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Card subcomponents
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: ReactNode
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, description, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-start justify-between gap-4 mb-4', className)}
      {...props}
    >
      {(title || description) ? (
        <div className="space-y-1">
          {title && <h3 className="text-lg font-semibold text-text-primary">{title}</h3>}
          {description && <p className="text-sm text-text-muted">{description}</p>}
        </div>
      ) : (
        children
      )}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
)

CardHeader.displayName = 'CardHeader'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
)

CardContent.displayName = 'CardContent'

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-3 mt-6 pt-4 border-t border-border', className)}
      {...props}
    />
  )
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardContent, CardFooter, type CardProps }

