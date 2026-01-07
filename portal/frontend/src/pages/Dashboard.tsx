import { motion } from 'framer-motion'
import { useAuth } from '../App'

interface Project {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  href: string
  gradient: string
  status: 'active' | 'coming-soon' | 'maintenance'
}

const projects: Project[] = [
  {
    id: 'nemx',
    name: 'NEMX',
    description: 'UK Nitrate & Phosphate Offset Exchange Platform - Trade environmental credits with Natural England compliance.',
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    href: '/nemx/',
    gradient: 'from-emerald-500 to-teal-600',
    status: 'active',
  },
  // Add more projects here as needed
  {
    id: 'project2',
    name: 'Coming Soon',
    description: 'More projects will be added here. This portal supports multiple applications.',
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    href: '#',
    gradient: 'from-slate-500 to-slate-600',
    status: 'coming-soon',
  },
]

const statusBadge = {
  'active': { label: 'Active', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  'coming-soon': { label: 'Coming Soon', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  'maintenance': { label: 'Maintenance', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
}

export default function Dashboard() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 bg-background">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Grid overlay */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.5) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(99, 102, 241, 0.5) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border bg-background-glass backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-glow">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-display font-semibold text-text-primary">Project Portal</h1>
                <p className="text-xs text-text-muted">Select a project to continue</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-text-primary hover:bg-background-elevated rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-display font-bold gradient-text mb-4">Your Projects</h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Access and manage your deployed applications from this central hub.
            </p>
          </motion.div>

          {/* Project grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-auto">
          <div className="max-w-7xl mx-auto px-6 py-6 text-center text-text-muted text-sm">
            <p>Project Portal · Secure access to your applications</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const isClickable = project.status === 'active'
  const badge = statusBadge[project.status]

  const cardContent = (
    <div className={`glass-card p-6 h-full group transition-all duration-300 ${isClickable ? 'hover:border-accent-primary/50 hover:shadow-glow cursor-pointer' : 'opacity-60'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${project.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform duration-300`}>
          {project.icon}
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Content */}
      <h3 className="text-xl font-display font-semibold text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
        {project.name}
      </h3>
      <p className="text-text-muted text-sm leading-relaxed mb-4">
        {project.description}
      </p>

      {/* Action */}
      {isClickable && (
        <div className="flex items-center text-accent-primary text-sm font-medium group-hover:gap-2 transition-all duration-200">
          <span>Open Project</span>
          <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      )}
    </div>
  )

  if (isClickable) {
    return (
      <a href={project.href} className="block h-full">
        {cardContent}
      </a>
    )
  }

  return cardContent
}

