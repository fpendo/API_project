import { FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Shell'
import { api } from '../api'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.login(password)
      navigate(location.state?.from ?? '/sites', { replace: true })
    } catch (err) {
      setError((err as Error).message === 'wrong password' ? 'That password isn\u2019t right.' : (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen relative bg-background flex items-center justify-center px-6">
      <div className="fixed inset-0">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-accent-primary/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-secondary/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link to="/"><Logo /></Link>
        </div>
        <form onSubmit={submit} className="glass-card p-8">
          <h1 className="font-display font-semibold text-xl mb-1">Studio login</h1>
          <p className="text-text-muted text-sm mb-6">The studio is for the Twin Native team.</p>
          <label className="block mb-4">
            <span className="text-text-muted text-xs uppercase tracking-wider block mb-1.5">Password</span>
            <input
              type="password"
              className="input-field w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-text-muted text-sm mt-6">
          <Link to="/" className="hover:text-text-primary transition-colors">← Back to twinnative.com</Link>
        </p>
      </div>
    </div>
  )
}
