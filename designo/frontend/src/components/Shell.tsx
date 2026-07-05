import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'
  return (
    <div className="flex items-center gap-3">
      <div className={`${box} bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-glow`}>
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5h4.5a6.5 6.5 0 0 1 0 13H8V5z" />
        </svg>
      </div>
      <span className="font-display font-semibold text-lg tracking-tight">Designo</span>
    </div>
  )
}

export default function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-background">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="border-b border-border bg-background-glass backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" aria-label="Designo home"><Logo /></Link>
            <nav className="flex items-center gap-2">
              <Link to="/sites" className="px-4 py-2 text-text-muted hover:text-text-primary hover:bg-background-elevated rounded-lg transition-all duration-200 text-sm">
                My Sites
              </Link>
              <Link to="/leads" className="px-4 py-2 text-text-muted hover:text-text-primary hover:bg-background-elevated rounded-lg transition-all duration-200 text-sm">
                Leads
              </Link>
              <Link to="/create" className="btn-primary !px-4 !py-2 text-sm">
                Create Website
              </Link>
              <a href="/" className="px-4 py-2 text-text-muted hover:text-text-primary hover:bg-background-elevated rounded-lg transition-all duration-200 text-sm">
                Portal
              </a>
            </nav>
          </div>
        </header>

        <main className={`flex-1 w-full mx-auto px-6 py-10 ${wide ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
          {children}
        </main>

        <footer className="border-t border-border">
          <div className="max-w-7xl mx-auto px-6 py-6 text-center text-text-muted text-sm">
            <p>Designo · Motion websites from a brief and your photos</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
