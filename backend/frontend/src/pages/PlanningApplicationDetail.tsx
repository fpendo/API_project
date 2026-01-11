import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout'
import { Button, Card, CardHeader, Badge, getStatusVariant } from '../components/ui'
import { NotificationBanner } from '../components/domain'
import { formatCredits, formatTonnage } from '../lib/utils'
import { API_BASE_URL } from '../api/config'

interface ApplicationScheme {
  scheme_id: number
  scheme_name: string
  credits_allocated: number
  status: string
}

interface Application {
  application_token: string
  developer_account_id: number
  developer_name: string
  catchment: string
  unit_type: string
  required_tonnage: number
  status: string
  created_at: string
  locked_at?: string
  burned_at?: string
  schemes: ApplicationScheme[]
  qr_code_data_url?: string
}

function PlanningApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/planning/validate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ application_token: id }),
        })
        if (res.ok) setApplication(await res.json())
      } catch (err) {
        console.error('Failed to fetch application:', err)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchApplication()
  }, [id])

  const handleLock = async () => {
    if (!application) return
    try {
      setProcessing(true)
      const res = await fetch(`${API_BASE_URL}/planning/lock-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_token: application.application_token }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Credits locked!' })
        setApplication(prev => prev ? { ...prev, status: 'LOCKED' } : null)
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Lock failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const handleBurn = async () => {
    if (!application) return
    try {
      setProcessing(true)
      const res = await fetch(`${API_BASE_URL}/planning/burn-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_token: application.application_token }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Credits burned - planning complete!' })
        setApplication(prev => prev ? { ...prev, status: 'BURNED' } : null)
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Burn failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <AppShell title="Application Details">
        <Card className="text-center py-12 text-text-muted">
          Loading application...
        </Card>
      </AppShell>
    )
  }

  if (!application) {
    return (
      <AppShell title="Application Details">
        <Card className="text-center py-12">
          <p className="text-text-muted mb-4">Application not found</p>
          <Button onClick={() => navigate('/planning')}>Back to Planning</Button>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Application Details"
      subtitle={`Token: ${application.application_token.slice(0, 20)}...`}
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
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Application Information"
              action={<Badge variant={getStatusVariant(application.status)} dot>{application.status}</Badge>}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-muted">Developer</p>
                <p className="font-medium text-text-primary">{application.developer_name}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Catchment</p>
                <Badge variant="info">{application.catchment}</Badge>
              </div>
              <div>
                <p className="text-sm text-text-muted">Unit Type</p>
                <p className="capitalize text-text-primary">{application.unit_type}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Created</p>
                <p className="text-text-primary">{new Date(application.created_at).toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Credit Allocation" />
            <div className="space-y-4">
              <div className="p-4 bg-background-elevated rounded-lg">
                <p className="text-sm text-text-muted">Required Tonnage</p>
                <p className="text-3xl font-mono font-bold text-accent-primary">
                  {formatTonnage(application.required_tonnage)}
                </p>
                <p className="text-sm text-text-muted mt-1">
                  = {formatCredits(application.required_tonnage * 100000)} credits
                </p>
              </div>
              
              {application.schemes && application.schemes.length > 0 && (
                <div>
                  <p className="text-sm text-text-muted mb-2">Allocated from Schemes</p>
                  <div className="space-y-2">
                    {application.schemes.map((scheme, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-background-surface rounded-lg border border-border">
                        <span className="font-medium">{scheme.scheme_name}</span>
                        <span className="font-mono text-accent-secondary">
                          {formatCredits(scheme.credits_allocated)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Actions & QR */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Actions" />
            <div className="space-y-3">
              {application.status === 'PENDING' && (
                <Button className="w-full" onClick={handleLock} loading={processing}>
                  Lock Credits
                </Button>
              )}
              {application.status === 'LOCKED' && (
                <>
                  <Button className="w-full" variant="success" onClick={handleBurn} loading={processing}>
                    Burn Credits (Approve)
                  </Button>
                  <Button className="w-full" variant="danger" loading={processing}>
                    Unlock (Reject)
                  </Button>
                </>
              )}
              {application.status === 'BURNED' && (
                <div className="text-center py-4">
                  <Badge variant="success" className="text-lg px-4 py-2">✓ Completed</Badge>
                  <p className="text-sm text-text-muted mt-2">
                    Burned on {application.burned_at ? new Date(application.burned_at).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {application.qr_code_data_url && (
            <Card>
              <CardHeader title="QR Code" />
              <div className="text-center">
                <img
                  src={application.qr_code_data_url}
                  alt="Application QR Code"
                  className="w-full max-w-[200px] mx-auto rounded-lg border border-border"
                />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Application Token" />
            <code className="block p-3 bg-background-elevated rounded-lg text-xs font-mono break-all text-text-secondary">
              {application.application_token}
            </code>
            <Button
              size="sm"
              variant="secondary"
              className="w-full mt-3"
              onClick={() => {
                navigator.clipboard.writeText(application.application_token)
                setMessage({ type: 'success', text: 'Token copied!' })
              }}
            >
              Copy Token
            </Button>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export default PlanningApplicationDetail
