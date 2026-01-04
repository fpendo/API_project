import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface NotificationBannerProps {
  type: NotificationType
  message: string
  onDismiss?: () => void
  autoDismiss?: number // ms to auto-dismiss, 0 to disable
  action?: {
    label: string
    onClick: () => void
  }
}

const typeStyles: Record<NotificationType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-status-success/10',
    border: 'border-status-success/30',
    icon: 'text-status-success',
  },
  error: {
    bg: 'bg-status-error/10',
    border: 'border-status-error/30',
    icon: 'text-status-error',
  },
  warning: {
    bg: 'bg-status-warning/10',
    border: 'border-status-warning/30',
    icon: 'text-status-warning',
  },
  info: {
    bg: 'bg-status-info/10',
    border: 'border-status-info/30',
    icon: 'text-status-info',
  },
}

const icons: Record<NotificationType, JSX.Element> = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

export function NotificationBanner({
  type,
  message,
  onDismiss,
  autoDismiss = 5000,
  action,
}: NotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const styles = typeStyles[type]

  useEffect(() => {
    if (autoDismiss > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss?.()
      }, autoDismiss)
      return () => clearTimeout(timer)
    }
  }, [autoDismiss, onDismiss])

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg border',
            styles.bg,
            styles.border
          )}
        >
          <span className={styles.icon}>{icons[type]}</span>
          <p className="flex-1 text-sm text-text-primary">{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm font-medium text-accent-primary hover:text-accent-primary-hover transition-colors"
            >
              {action.label}
            </button>
          )}
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook for managing notifications
interface Notification {
  id: string
  type: NotificationType
  message: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (type: NotificationType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setNotifications((prev) => [...prev, { id, type, message }])
    return id
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const success = (message: string) => addNotification('success', message)
  const error = (message: string) => addNotification('error', message)
  const warning = (message: string) => addNotification('warning', message)
  const info = (message: string) => addNotification('info', message)

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
  }
}

// Container component for stacking notifications
interface NotificationsContainerProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

export function NotificationsContainer({ notifications, onDismiss }: NotificationsContainerProps) {
  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-2 max-w-md w-full">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationBanner
            key={notification.id}
            type={notification.type}
            message={notification.message}
            onDismiss={() => onDismiss(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

