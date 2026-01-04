import { useState, useEffect } from 'react'
import { AppShell } from '../components/layout'
import { Button, Card, CardHeader, Badge } from '../components/ui'
import { NotificationBanner } from '../components/domain'
import { formatGBP } from '../lib/utils'

const API_BASE_URL = 'http://localhost:8000'

interface Account {
  account_id: number
  name: string
  role: string
  eth_address: string
  balance_gbp: number
  created_at: string
}

function Profile() {
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    // For demo, load first account
    const fetchAccount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/accounts/1`)
        if (res.ok) setAccount(await res.json())
      } catch (err) {
        console.error('Failed to fetch account:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAccount()
  }, [])

  if (loading) {
    return (
      <AppShell title="Profile">
        <Card className="text-center py-12 text-text-muted">
          Loading profile...
        </Card>
      </AppShell>
    )
  }

  if (!account) {
    return (
      <AppShell title="Profile">
        <Card className="text-center py-12 text-text-muted">
          Account not found
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Profile"
      subtitle="Manage your account settings"
      maxWidth="lg"
    >
      {message && (
        <div className="mb-6">
          <NotificationBanner
            type={message.type}
            message={message.text}
            onDismiss={() => setMessage(null)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Account Information" />
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-2xl font-bold text-background-deep">
                  {account.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">{account.name}</h2>
                  <Badge variant="default" className="capitalize mt-1">{account.role}</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-text-muted">Account ID</p>
                  <p className="font-mono text-text-primary">{account.account_id}</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Role</p>
                  <p className="capitalize text-text-primary">{account.role}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm text-text-muted">Ethereum Address</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-text-secondary bg-background-elevated px-2 py-1 rounded">
                      {account.eth_address}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(account.eth_address)
                        setMessage({ type: 'success', text: 'Address copied!' })
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Member Since</p>
                  <p className="text-text-primary">
                    {new Date(account.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Balance Card */}
        <div>
          <Card>
            <CardHeader title="Balance" />
            <div className="text-center py-4">
              <p className="text-sm text-text-muted uppercase tracking-wider">Available</p>
              <p className="text-3xl font-mono font-bold text-accent-primary mt-2">
                {formatGBP(account.balance_gbp)}
              </p>
            </div>
          </Card>
          
          <Card className="mt-4">
            <CardHeader title="Quick Links" />
            <div className="space-y-2">
              <Button variant="secondary" className="w-full justify-start">
                View Transaction History
              </Button>
              <Button variant="secondary" className="w-full justify-start">
                Export Data
              </Button>
              <Button variant="ghost" className="w-full justify-start text-status-error">
                Sign Out
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export default Profile
