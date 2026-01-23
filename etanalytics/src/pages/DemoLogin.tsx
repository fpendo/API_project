import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, ArrowRight, Building2, BarChart3, Play, Sparkles } from 'lucide-react'

const DemoLogin = () => {
  const navigate = useNavigate()
  const [selectedPortal, setSelectedPortal] = useState<'issuer' | 'analyst'>('issuer')
  const [isLoading, setIsLoading] = useState(false)

  const handleDemo = async () => {
    setIsLoading(true)
    
    // Store demo session
    sessionStorage.setItem('eta_demo_mode', 'true')
    sessionStorage.setItem('eta_demo_portal', selectedPortal)
    
    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Navigate to selected portal
    navigate(selectedPortal === 'issuer' ? '/issuer' : '/analysis')
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-semibold text-white">ET Analytics</span>
        </Link>

        {/* Demo Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Interactive Demo Mode</span>
          </div>
        </div>

        {/* Card */}
        <div className="card-glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-2">Try the Demo</h1>
          <p className="text-gray-400 text-center mb-8">
            Experience ET Analytics with sample data. No signup required.
          </p>

          {/* Portal Selection */}
          <div className="space-y-4 mb-8">
            <p className="text-sm text-gray-400 text-center">Select a portal to explore:</p>
            
            <button
              onClick={() => setSelectedPortal('issuer')}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                selectedPortal === 'issuer'
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-white/10 hover:border-white/20 bg-dark-800'
              }`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                selectedPortal === 'issuer' ? 'bg-primary-500/20' : 'bg-dark-700'
              }`}>
                <Building2 className={`w-6 h-6 ${selectedPortal === 'issuer' ? 'text-primary-400' : 'text-gray-500'}`} />
              </div>
              <div className="text-left">
                <div className={`font-semibold ${selectedPortal === 'issuer' ? 'text-white' : 'text-gray-300'}`}>
                  Issuer Portal
                </div>
                <div className="text-sm text-gray-500">
                  View as an ETF issuer - see ownership analytics & reports
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedPortal('analyst')}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                selectedPortal === 'analyst'
                  ? 'border-accent-500 bg-accent-500/10'
                  : 'border-white/10 hover:border-white/20 bg-dark-800'
              }`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                selectedPortal === 'analyst' ? 'bg-accent-500/20' : 'bg-dark-700'
              }`}>
                <BarChart3 className={`w-6 h-6 ${selectedPortal === 'analyst' ? 'text-accent-400' : 'text-gray-500'}`} />
              </div>
              <div className="text-left">
                <div className={`font-semibold ${selectedPortal === 'analyst' ? 'text-white' : 'text-gray-300'}`}>
                  Analyst Portal
                </div>
                <div className="text-sm text-gray-500">
                  View as an analyst - manage workflows & entity database
                </div>
              </div>
            </button>
          </div>

          {/* Demo Button */}
          <button
            onClick={handleDemo}
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-white ${
              selectedPortal === 'issuer'
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500'
                : 'bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-400 hover:to-accent-500'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5" /> Enter Demo
              </>
            )}
          </button>

          {/* Demo Info */}
          <div className="mt-6 p-4 bg-dark-800/50 rounded-xl">
            <p className="text-xs text-gray-500 text-center">
              This demo uses sample data from Amundi, BlackRock, and Vanguard registers. 
              All data is fictional for demonstration purposes.
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="text-center mt-6 space-y-3">
          <p className="text-gray-500">
            Ready for the real thing?{' '}
            <Link to="/signup" className="text-primary-400 hover:underline">
              Sign up for live access
            </Link>
          </p>
          <p className="text-gray-500">
            <Link to="/" className="hover:text-white transition-colors">
              ← Back to Home
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default DemoLogin



