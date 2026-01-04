import { createContext, useContext, type ReactNode, type HTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

// Context for tabs
interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

function useTabs() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider')
  }
  return context
}

// Tabs Root
interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  className?: string
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

// Tabs List
interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'pills' | 'underline'
}

const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default:
        'inline-flex h-11 items-center justify-center rounded-lg bg-background-elevated p-1 text-text-muted',
      pills: 'inline-flex items-center gap-1',
      underline: 'flex border-b border-border',
    }

    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(variants[variant], className)}
        {...props}
      />
    )
  }
)
TabsList.displayName = 'TabsList'

// Tabs Trigger
interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string
  variant?: 'default' | 'pills' | 'underline'
  disabled?: boolean
}

const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, variant = 'default', disabled = false, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useTabs()
    const isActive = value === selectedValue

    const baseStyles =
      'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:pointer-events-none disabled:opacity-50'

    const variantStyles = {
      default: cn(
        'rounded-md px-4 py-1.5 text-sm',
        isActive
          ? 'bg-background-surface text-text-primary shadow-sm'
          : 'hover:text-text-primary'
      ),
      pills: cn(
        'rounded-lg px-4 py-2 text-sm',
        isActive
          ? 'bg-accent-primary text-background-deep'
          : 'hover:bg-background-elevated hover:text-text-primary'
      ),
      underline: cn(
        'relative px-4 py-3 text-sm -mb-px',
        isActive ? 'text-accent-primary' : 'hover:text-text-primary'
      ),
    }

    return (
      <button
        ref={ref}
        role="tab"
        type="button"
        aria-selected={isActive}
        disabled={disabled}
        onClick={() => onValueChange(value)}
        className={cn(baseStyles, variantStyles[variant], className)}
        {...props}
      >
        {children}
        {/* Underline indicator for underline variant */}
        {variant === 'underline' && isActive && (
          <motion.div
            layoutId="tab-underline"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary"
            transition={{ duration: 0.2 }}
          />
        )}
      </button>
    )
  }
)
TabsTrigger.displayName = 'TabsTrigger'

// Tabs Content
interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children }, ref) => {
    const { value: selectedValue } = useTabs()

    if (value !== selectedValue) return null

    return (
      <motion.div
        ref={ref}
        role="tabpanel"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn('mt-4 focus-visible:outline-none', className)}
      >
        {children}
      </motion.div>
    )
  }
)
TabsContent.displayName = 'TabsContent'

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type TabsProps,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentProps,
}

