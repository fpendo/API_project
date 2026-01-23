import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, ArrowRight, Lock, Mail } from 'lucide-react'

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simple validation
    if (!email || !password) {
      setError('Please enter both email and password')
      setIsLoading(false)
      return
    }

    // Check credentials (same as gate login)
    const validCredentials = [
      { email: 'admin@etanalytics.co.uk', password: 'Admin2024!' },
      { email: 'issuer@etanalytics.co.uk', password: 'Issuer123!' },
      { email: 'analyst@etanalytics.co.uk', password: 'Analyst123!' },
    ]

    const isValid = validCredentials.some(
      cred => cred.email.toLowerCase() === email.toLowerCase() && cred.password === password
    )

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500))

    if (isValid) {
      // Store login state
      sessionStorage.setItem('eta_logged_in', 'true')
      sessionStorage.setItem('eta_user', email)
      navigate('/issuer')
    } else {
      setError('Invalid email or password')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-[120px]" />

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

        {/* Login Card */}
        <div className="card-glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-2">Sign In</h1>
          <p className="text-gray-400 text-center mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleLogin}>
            {/* Email Field */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-dark-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-dark-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-400 hover:to-accent-400 disabled:opacity-50 disabled:cursor-not-allowed text-white"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back to Home */}
        <p className="text-center text-gray-500 mt-6">
          <Link to="/" className="hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Login
