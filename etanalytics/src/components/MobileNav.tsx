import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Home,
  BarChart3, 
  FileSpreadsheet, 
  TrendingUp, 
  Upload, 
  FileText, 
  Settings,
  Layers,
  Building2,
  Database,
  Target,
  Eye,
  ArrowLeftRight
} from 'lucide-react'

interface NavItem {
  path: string
  icon: React.ElementType
  label: string
  exact?: boolean
}

interface MobileNavProps {
  portal: 'issuer' | 'analyst'
  issuerName?: string
  issuerLogo?: string
  issuerColor?: string
}

// Navigation items for each portal
const issuerNavItems: NavItem[] = [
  { path: '/issuer', icon: BarChart3, label: 'Overview', exact: true },
  { path: '/issuer/registers', icon: FileSpreadsheet, label: 'Registers' },
  { path: '/issuer/analytics', icon: TrendingUp, label: 'Analytics' },
  { path: '/issuer/upload', icon: Upload, label: 'Upload Register' },
  { path: '/issuer/reports', icon: FileText, label: 'Reports' },
  { path: '/issuer/settings', icon: Settings, label: 'Settings' },
]

const analystNavItems: NavItem[] = [
  { path: '/analysis', icon: Layers, label: 'Queue', exact: true },
  { path: '/analysis/clients', icon: Building2, label: 'Clients' },
  { path: '/analysis/entities', icon: Database, label: 'Entity Database' },
  { path: '/analysis/etfs', icon: BarChart3, label: 'ETF Database' },
  { path: '/analysis/workflows', icon: Target, label: 'Workflows' },
  { path: '/analysis/settings', icon: Settings, label: 'Settings' },
]

export const MobileNav: React.FC<MobileNavProps> = ({ 
  portal, 
  issuerName, 
  issuerLogo, 
  issuerColor 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  const navItems = portal === 'issuer' ? issuerNavItems : analystNavItems
  const switchPath = portal === 'issuer' ? '/analysis' : '/issuer'
  const switchLabel = portal === 'issuer' ? 'Analyst' : 'Issuer'
  const SwitchIcon = portal === 'issuer' ? Target : Building2

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <>
      {/* Mobile Top Bar - Fixed header with all navigation buttons */}
      <div className="mobile-nav-topbar fixed top-0 left-0 right-0 h-14 bg-dark-900 border-b border-white/10 flex items-center justify-between px-3 z-40 lg:hidden">
        {/* Left: Hamburger Menu */}
        <button
          onClick={() => setIsOpen(true)}
          className="p-2.5 bg-dark-800 border border-accent-500/30 rounded-xl"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 text-accent-400" />
        </button>

        {/* Center: Home Button */}
        <Link
          to="/"
          className="p-2.5 bg-dark-800 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all"
          aria-label="Go to home"
        >
          <Home className="w-5 h-5" />
        </Link>

        {/* Right: Switch Portal Button */}
        <Link
          to={switchPath}
          className="flex items-center gap-2 px-3 py-2 bg-dark-800 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all"
          aria-label={`Switch to ${switchLabel} Portal`}
        >
          <SwitchIcon className="w-4 h-4" />
          <span className="text-xs font-medium">{switchLabel}</span>
        </Link>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="mobile-nav-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`mobile-nav-sidebar fixed top-0 left-0 h-full w-72 bg-dark-900 border-r border-white/10 z-50 transform transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {portal === 'issuer' && issuerLogo ? (
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: issuerColor || '#10b981' }}
              >
                {issuerLogo}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="text-sm font-semibold text-white">
                {portal === 'issuer' ? (issuerName || 'Issuer Portal') : 'Analyst Portal'}
              </div>
              <div className="text-xs text-gray-500">
                {portal === 'issuer' ? 'Client Dashboard' : 'Full Access'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Home Link */}
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </Link>

          <div className="h-px bg-white/10 my-3" />

          {/* Portal Navigation */}
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive(item.path, item.exact)
                  ? 'bg-accent-500/20 text-accent-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="h-px bg-white/10 my-3" />

          {/* Switch Portal */}
          <Link
            to={switchPath}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span>Switch to {switchLabel} Portal</span>
          </Link>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-gray-500 text-center">
            ET Analytics v2.0
          </div>
        </div>
      </aside>
    </>
  )
}

export default MobileNav
