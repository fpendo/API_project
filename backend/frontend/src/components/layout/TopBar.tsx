import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

const roles = [
  { name: 'Landowner', path: '/landowner', icon: '🌾', description: 'Submit schemes & manage credits' },
  { name: 'Regulator', path: '/regulator', icon: '⚖️', description: 'Review & approve schemes' },
  { name: 'Broker', path: '/broker', icon: '📊', description: 'Manage client portfolios' },
  { name: 'Developer', path: '/developer', icon: '🏗️', description: 'Buy credits & generate QR' },
  { name: 'Planning', path: '/planning', icon: '📋', description: 'Validate & process applications' },
  { name: 'Operator', path: '/operator', icon: '⚙️', description: 'Manage exchange operations' },
]

interface TopBarProps {
  title?: string
  showBack?: boolean
}

export function TopBar({ title, showBack = true }: TopBarProps) {
  const [isRoleSelectorOpen, setIsRoleSelectorOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentRole = roles.find((role) => location.pathname.startsWith(role.path))

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleSelectorOpen(false)
      }
    }
    if (isRoleSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isRoleSelectorOpen])

  const handleBack = () => navigate(-1)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side: Back button + Title */}
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={handleBack}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
                'text-text-muted hover:text-text-primary hover:bg-background-surface',
                'transition-colors duration-150'
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
          {title && <h1 className="text-lg font-semibold text-text-primary">{title}</h1>}
        </div>

        {/* Right side: Role selector */}
        <div className="flex items-center gap-4" ref={dropdownRef}>
          {/* Home link */}
          <Link
            to="/"
            className={cn(
              'p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-surface',
              'transition-colors duration-150'
            )}
            title="Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>

          {/* Role selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsRoleSelectorOpen(!isRoleSelectorOpen)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-background-surface border border-border',
                'text-text-primary font-medium text-sm',
                'hover:border-accent-primary/50 transition-colors duration-150'
              )}
            >
              {currentRole && <span>{currentRole.icon}</span>}
              <span>{currentRole?.name || 'Select Role'}</span>
              <svg
                className={cn('w-4 h-4 text-text-muted transition-transform', isRoleSelectorOpen && 'rotate-180')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <AnimatePresence>
              {isRoleSelectorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'absolute right-0 mt-2 w-64 py-2 rounded-xl',
                    'bg-background-surface border border-border shadow-elevated',
                    'origin-top-right'
                  )}
                >
                  {roles.map((role) => (
                    <button
                      key={role.path}
                      onClick={() => {
                        navigate(role.path)
                        setIsRoleSelectorOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-left',
                        'hover:bg-background-elevated transition-colors',
                        location.pathname.startsWith(role.path) && 'bg-accent-primary/10'
                      )}
                    >
                      <span className="text-xl shrink-0">{role.icon}</span>
                      <div>
                        <div className={cn(
                          'font-medium',
                          location.pathname.startsWith(role.path) ? 'text-accent-primary' : 'text-text-primary'
                        )}>
                          {role.name}
                        </div>
                        <div className="text-xs text-text-muted">{role.description}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}

