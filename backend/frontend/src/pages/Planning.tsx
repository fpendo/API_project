import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell, Section } from '../components/layout'
import { Button, Card, CardHeader, Badge, getStatusVariant, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui'
import { StatCard, StatsGrid, NotificationBanner } from '../components/domain'
import { formatCredits, formatTonnage } from '../lib/utils'
import { API_BASE_URL } from '../api/config'

// Types
interface SchemeBreakdown {
  scheme_nft_id: number
  scheme_name: string
  location: string
  tonnes_from_scheme: number
  credits_from_scheme: number
  available_credits: number
  scheme_remaining_tonnes: number
  catchment: string
}

interface ValidatedApplication {
  application_id: number
  developer_name: string
  developer_account_id: number
  planning_reference?: string
  catchment: string
  unit_type: string
  total_tonnage: number
  total_credits: number
  status: string
  schemes: SchemeBreakdown[]
}

interface ArchivedApplication {
  application_id: number
  application_token: string
  developer_name: string
  developer_account_id: number
  planning_reference?: string
  catchment: string
  unit_type: string
  total_tonnage: number
  total_credits: number
  status: string
  created_at: string
  on_chain_application_id?: number
}

function Planning() {
  const [activeTab, setActiveTab] = useState('validate')
  const [applications, setApplications] = useState<ArchivedApplication[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Token input
  const [tokenInput, setTokenInput] = useState('')
  const [validating, setValidating] = useState(false)
  const [validatedApp, setValidatedApp] = useState<ValidatedApplication | null>(null)
  
  // Processing
  const [processing, setProcessing] = useState(false)

  // Fetch applications from archive
  const fetchApplications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/planning/applications/archive`)
      if (res.ok) setApplications(await res.json())
    } catch (err) {
      console.error('Failed to fetch applications:', err)
    }
  }

  useEffect(() => {
    fetchApplications()
    const interval = setInterval(fetchApplications, 10000)
    return () => clearInterval(interval)
  }, [])

  // Validate token - this also locks credits on-chain if not already locked
  const handleValidate = async () => {
    if (!tokenInput.trim()) return
    
    try {
      setValidating(true)
      const res = await fetch(`${API_BASE_URL}/planning/validate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_token: tokenInput }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setValidatedApp(data)
        // Validation auto-locks credits, so update message accordingly
        if (data.status === 'LOCKED') {
          setMessage({ type: 'success', text: 'Token validated and credits locked!' })
        } else {
          setMessage({ type: 'success', text: 'Token validated successfully' })
        }
        fetchApplications() // Refresh list since status may have changed
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Invalid token' })
        setValidatedApp(null)
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setValidating(false)
    }
  }

  // Burn credits for a validated/locked application
  const handleBurn = async (app: ValidatedApplication | ArchivedApplication) => {
    const appId = 'application_id' in app ? app.application_id : null
    if (!appId) {
      setMessage({ type: 'error', text: 'No application ID found' })
      return
    }
    
    try {
      setProcessing(true)
      const res = await fetch(`${API_BASE_URL}/planning/applications/${appId}/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Credits burned - planning complete!' })
        setValidatedApp(null)
        setTokenInput('')
        fetchApplications()
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

  // Unlock credits (reject application)
  const handleUnlock = async (app: ValidatedApplication | ArchivedApplication) => {
    const appId = 'application_id' in app ? app.application_id : null
    if (!appId) {
      setMessage({ type: 'error', text: 'No application ID found' })
      return
    }
    
    try {
      setProcessing(true)
      const res = await fetch(`${API_BASE_URL}/planning/applications/${appId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Credits unlocked - returned to developer' })
        setValidatedApp(null)
        setTokenInput('')
        fetchApplications()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Unlock failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  // Filter applications
  const lockedApps = applications.filter(a => a.status === 'LOCKED')
  const approvedApps = applications.filter(a => a.status === 'APPROVED') // "Burned" = APPROVED in backend
  const pendingApps = applications.filter(a => a.status === 'PENDING')
  
  const totalBurned = approvedApps.reduce((sum, a) => sum + a.total_tonnage, 0)

  return (
    <AppShell
      title="Planning Officer Portal"
      subtitle="Validate and process planning applications"
    >
      {/* Notification */}
      <AnimatePresence>
        {message && (
          <div className="mb-6">
            <NotificationBanner
              type={message.type}
              message={message.text}
              onDismiss={() => setMessage(null)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <StatsGrid columns={4}>
        <StatCard label="Pending Validation" value={pendingApps.length} variant="warning" />
        <StatCard label="Locked" value={lockedApps.length} variant="info" />
        <StatCard label="Completed (Burned)" value={approvedApps.length} variant="success" />
        <StatCard label="Total Burned Tonnage" value={totalBurned} format="tonnage" variant="primary" />
      </StatsGrid>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="underline">
          <TabsTrigger value="validate" variant="underline">Validate Token</TabsTrigger>
          <TabsTrigger value="locked" variant="underline">Locked ({lockedApps.length})</TabsTrigger>
          <TabsTrigger value="history" variant="underline">Completed ({approvedApps.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="validate">
          <Section title="Token Validation" description="Enter a developer's planning application token to validate">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Token Input */}
              <Card>
                <CardHeader title="Enter Application Token" />
                <div className="space-y-4">
                  <Input
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Paste application token here..."
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    }
                  />
                  <Button
                    className="w-full"
                    onClick={handleValidate}
                    loading={validating}
                    disabled={!tokenInput.trim()}
                  >
                    Validate Token
                  </Button>
                </div>
              </Card>

              {/* Validation Result */}
              <AnimatePresence mode="wait">
                {validatedApp ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card variant="elevated">
                      <CardHeader
                        title="Application Valid"
                        action={<Badge variant="success" dot>Verified</Badge>}
                      />
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-text-muted">Developer</p>
                            <p className="font-medium">{validatedApp.developer_name}</p>
                          </div>
                          <div>
                            <p className="text-text-muted">Status</p>
                            <Badge variant={getStatusVariant(validatedApp.status)}>
                              {validatedApp.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-text-muted">Catchment</p>
                            <Badge variant="info">{validatedApp.catchment}</Badge>
                          </div>
                          <div>
                            <p className="text-text-muted">Type</p>
                            <p className="capitalize">{validatedApp.unit_type}</p>
                          </div>
                          {validatedApp.planning_reference && (
                            <div className="col-span-2">
                              <p className="text-text-muted">Planning Reference</p>
                              <p className="font-mono">{validatedApp.planning_reference}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4 bg-background-elevated rounded-lg">
                          <p className="text-sm text-text-muted mb-1">Total Tonnage</p>
                          <p className="text-2xl font-mono font-bold text-accent-primary">
                            {formatTonnage(validatedApp.total_tonnage)}
                          </p>
                          <p className="text-sm text-text-muted mt-1">
                            = {formatCredits(validatedApp.total_credits)} credits
                          </p>
                        </div>
                        
                        {validatedApp.schemes && validatedApp.schemes.length > 0 && (
                          <div>
                            <p className="text-sm text-text-muted mb-2">Schemes Allocated</p>
                            <div className="space-y-2">
                              {validatedApp.schemes.map((scheme, i) => (
                                <div key={i} className="flex justify-between text-sm p-2 bg-background-surface rounded">
                                  <div>
                                    <span className="font-medium">{scheme.scheme_name}</span>
                                    <span className="text-text-muted ml-2">({scheme.location})</span>
                                  </div>
                                  <span className="font-mono">{formatCredits(scheme.credits_from_scheme)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-4 border-t border-border">
                          {validatedApp.status === 'LOCKED' && (
                            <>
                              <Button
                                variant="danger"
                                className="flex-1"
                                onClick={() => handleUnlock(validatedApp)}
                                loading={processing}
                              >
                                Unlock (Reject)
                              </Button>
                              <Button
                                variant="success"
                                className="flex-1"
                                onClick={() => handleBurn(validatedApp)}
                                loading={processing}
                              >
                                Burn (Approve)
                              </Button>
                            </>
                          )}
                          {validatedApp.status === 'APPROVED' && (
                            <Badge variant="success" className="flex-1 justify-center py-2">
                              Credits Already Burned
                            </Badge>
                          )}
                          {validatedApp.status === 'REJECTED' && (
                            <Badge variant="error" className="flex-1 justify-center py-2">
                              Application Rejected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="h-full flex items-center justify-center min-h-[300px]">
                      <div className="text-center text-text-muted">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <p>Enter a token to validate a planning application</p>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="locked">
          <Section title="Locked Applications" description="Applications with credits locked awaiting final decision">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead>Catchment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead align="right">Tonnage</TableHead>
                    <TableHead align="right">Credits</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead align="center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lockedApps.length === 0 ? (
                    <TableEmpty title="No locked applications" description="Validate a token to lock credits" />
                  ) : (
                    lockedApps.map((app) => (
                      <TableRow key={app.application_token}>
                        <TableCell className="font-medium">{app.developer_name}</TableCell>
                        <TableCell><Badge variant="info">{app.catchment}</Badge></TableCell>
                        <TableCell className="capitalize">{app.unit_type}</TableCell>
                        <TableCell align="right" mono>{formatTonnage(app.total_tonnage)}</TableCell>
                        <TableCell align="right" mono>{formatCredits(app.total_credits)}</TableCell>
                        <TableCell className="text-text-muted text-sm">
                          {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell align="center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleUnlock(app)}
                              loading={processing}
                            >
                              Unlock
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleBurn(app)}
                              loading={processing}
                            >
                              Burn
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </Section>
        </TabsContent>

        <TabsContent value="history">
          <Section title="Completed Applications" description="Applications where credits have been burned">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead>Catchment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead align="right">Tonnage</TableHead>
                    <TableHead align="right">Credits</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedApps.length === 0 ? (
                    <TableEmpty title="No completed applications" />
                  ) : (
                    approvedApps.map((app) => (
                      <TableRow key={app.application_token}>
                        <TableCell className="font-medium">{app.developer_name}</TableCell>
                        <TableCell><Badge variant="info">{app.catchment}</Badge></TableCell>
                        <TableCell className="capitalize">{app.unit_type}</TableCell>
                        <TableCell align="right" mono>{formatTonnage(app.total_tonnage)}</TableCell>
                        <TableCell align="right" mono>{formatCredits(app.total_credits)}</TableCell>
                        <TableCell className="text-text-muted text-sm">
                          {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="success">Burned</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </Section>
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}

export default Planning
