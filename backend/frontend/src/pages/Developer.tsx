import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell, Section } from '../components/layout'
import { Button, Card, Badge, getStatusVariant, Modal, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui'
import { StatCard, StatsGrid, NotificationBanner } from '../components/domain'
import { formatCredits, formatTonnage } from '../lib/utils'

const API_BASE_URL = 'http://localhost:8000'
const MOCK_DEVELOPER_ACCOUNT_ID = 5
const INITIAL_BALANCE = 5_000_000

const CATCHMENTS = ['SOLENT', 'THAMES', 'SEVERN', 'HUMBER', 'MERSEY', 'TEES', 'TYNE', 'WESSEX']
const UNIT_TYPES = ['nitrate', 'phosphate']

// Types
interface CatchmentBalance {
  catchment: string
  unit_type: string
  available_credits: number
  locked_credits: number
  burned_credits: number
  total_credits: number
  available_tonnes: number
  locked_tonnes: number
  burned_tonnes: number
  total_tonnes: number
}

interface PlanningApplication {
  id: string
  application_token: string
  catchment: string
  unit_type: string
  total_tonnage: number
  total_credits: number
  status: string
  created_at: string
  qr_code_data_url?: string
}

function Developer() {
  // State
  const [activeTab, setActiveTab] = useState('account')
  const [balances, setBalances] = useState<CatchmentBalance[]>([])
  const [applications, setApplications] = useState<PlanningApplication[]>([])
  const [accountBalance, setAccountBalance] = useState(INITIAL_BALANCE)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // QR Generator state
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedCatchment, setSelectedCatchment] = useState('SOLENT')
  const [selectedUnitType, setSelectedUnitType] = useState('nitrate')
  const [creditAmount, setCreditAmount] = useState('')
  const [planningRef, setPlanningRef] = useState('')
  const [generating, setGenerating] = useState(false)
  
  // Expanded application
  const [expandedApp, setExpandedApp] = useState<string | null>(null)

  // Fetch functions
  const fetchBalances = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/developer/credit-balances-by-catchment?account_id=${MOCK_DEVELOPER_ACCOUNT_ID}`)
      if (res.ok) {
        const data = await res.json()
        setBalances(data.balances || [])
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err)
    }
  }

  const fetchApplications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/developer/planning-applications?developer_account_id=${MOCK_DEVELOPER_ACCOUNT_ID}`)
      if (res.ok) {
        const data = await res.json()
        setApplications(data.map((app: any) => ({
          id: app.application_token,
          application_token: app.application_token,
          catchment: app.catchment,
          unit_type: app.unit_type,
          total_tonnage: app.required_tonnage,
          total_credits: app.schemes?.reduce((sum: number, s: any) => sum + s.credits_allocated, 0) || 0,
          status: app.status,
          created_at: app.created_at,
          qr_code_data_url: app.qr_code_data_url,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err)
    }
  }

  const fetchAccountBalance = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${MOCK_DEVELOPER_ACCOUNT_ID}/balance`)
      if (res.ok) {
        const data = await res.json()
        setAccountBalance(data.balance_gbp || INITIAL_BALANCE)
      }
    } catch (err) {
      console.error('Failed to fetch account balance:', err)
    }
  }

  useEffect(() => {
    fetchBalances()
    fetchApplications()
    fetchAccountBalance()
    setLoading(false)
    
    const interval = setInterval(() => {
      fetchBalances()
      fetchAccountBalance()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Generate QR
  const handleGenerateQR = async () => {
    const amount = parseFloat(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid credit amount' })
      return
    }
    
    const balance = balances.find(b => b.catchment === selectedCatchment && b.unit_type === selectedUnitType)
    if (!balance || amount > balance.available_credits) {
      setMessage({ type: 'error', text: 'Insufficient credits available' })
      return
    }
    
    try {
      setGenerating(true)
      const tonnage = amount / 100000 // Convert credits to tonnes
      
      const res = await fetch(`${API_BASE_URL}/developer/planning-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          developer_account_id: MOCK_DEVELOPER_ACCOUNT_ID,
          catchment: selectedCatchment,
          unit_type: selectedUnitType,
          required_tonnage: tonnage,
          planning_reference: planningRef || null,
        }),
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Planning QR generated successfully!' })
        setShowQRModal(false)
        setCreditAmount('')
        setPlanningRef('')
        fetchBalances()
        fetchApplications()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Failed to generate QR' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setGenerating(false)
    }
  }

  // Computed values
  const totalCredits = balances.reduce((sum, b) => sum + b.total_credits, 0)
  const totalAvailable = balances.reduce((sum, b) => sum + b.available_credits, 0)
  const totalLocked = balances.reduce((sum, b) => sum + b.locked_credits, 0)
  
  const selectedBalance = balances.find(b => b.catchment === selectedCatchment && b.unit_type === selectedUnitType)

  return (
    <AppShell
      title="Developer Dashboard"
      subtitle="Purchase credits and generate planning QR codes"
      actions={
        <div className="flex gap-3">
          <Link to="/exchange" state={{ role: 'developer' }}>
            <Button variant="secondary">Exchange</Button>
          </Link>
          <Button onClick={() => setShowQRModal(true)}>Generate Planning QR</Button>
        </div>
      }
    >
      {/* Notification banner */}
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
        <StatCard 
          label="Account Balance" 
          value={accountBalance} 
          format="currency" 
          variant="success"
        />
        <StatCard label="Total Credits" value={totalCredits} format="credits" />
        <StatCard label="Available" value={totalAvailable} format="credits" variant="primary" />
        <StatCard label="Locked" value={totalLocked} format="credits" variant="warning" />
      </StatsGrid>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="underline">
          <TabsTrigger value="account" variant="underline">Holdings</TabsTrigger>
          <TabsTrigger value="applications" variant="underline">Planning Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Section title="Credit Holdings by Catchment">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catchment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead align="right">Available</TableHead>
                    <TableHead align="right">Locked</TableHead>
                    <TableHead align="right">Burned</TableHead>
                    <TableHead align="right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-text-muted">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : balances.length === 0 ? (
                    <TableEmpty
                      title="No credits yet"
                      description="Purchase credits from the exchange to get started"
                      action={
                        <Link to="/exchange" state={{ role: 'developer' }}>
                          <Button size="sm">Go to Exchange</Button>
                        </Link>
                      }
                    />
                  ) : (
                    balances.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant="info">{b.catchment}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{b.unit_type}</TableCell>
                        <TableCell align="right" mono className="text-status-success">
                          {formatCredits(b.available_credits)}
                          <span className="text-text-muted text-xs block">
                            {formatTonnage(b.available_tonnes)}
                          </span>
                        </TableCell>
                        <TableCell align="right" mono className="text-status-info">
                          {formatCredits(b.locked_credits)}
                        </TableCell>
                        <TableCell align="right" mono className="text-text-muted">
                          {formatCredits(b.burned_credits)}
                        </TableCell>
                        <TableCell align="right" mono className="font-semibold">
                          {formatCredits(b.total_credits)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </Section>
        </TabsContent>

        <TabsContent value="applications">
          <Section title="Planning Applications" description="Your generated planning QR codes">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Catchment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead align="right">Credits</TableHead>
                    <TableHead align="right">Tonnage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead align="center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.length === 0 ? (
                    <TableEmpty
                      title="No applications yet"
                      description="Generate a planning QR code to lock credits for your development"
                      action={<Button size="sm" onClick={() => setShowQRModal(true)}>Generate QR</Button>}
                    />
                  ) : (
                    applications.map((app) => (
                      <>
                        <TableRow key={app.id}>
                          <TableCell className="text-sm">
                            {new Date(app.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="info">{app.catchment}</Badge>
                          </TableCell>
                          <TableCell className="capitalize">{app.unit_type}</TableCell>
                          <TableCell align="right" mono>
                            {formatCredits(app.total_credits)}
                          </TableCell>
                          <TableCell align="right" mono>
                            {formatTonnage(app.total_tonnage)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(app.status)} dot>
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                            >
                              {expandedApp === app.id ? 'Hide' : 'View QR'}
                            </Button>
                          </TableCell>
                        </TableRow>
                        
                        <AnimatePresence>
                          {expandedApp === app.id && (
                            <tr>
                              <td colSpan={7} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden bg-background-elevated/50"
                                >
                                  <div className="p-6 flex gap-6">
                                    <Card className="flex-1">
                                      <h4 className="font-semibold mb-2">Application Token</h4>
                                      <code className="block p-3 bg-background-deep rounded-lg text-sm font-mono break-all">
                                        {app.application_token}
                                      </code>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="mt-3"
                                        onClick={() => {
                                          navigator.clipboard.writeText(app.application_token)
                                          setMessage({ type: 'success', text: 'Token copied!' })
                                        }}
                                      >
                                        Copy Token
                                      </Button>
                                    </Card>
                                    
                                    {app.qr_code_data_url && (
                                      <div className="shrink-0">
                                        <h4 className="font-semibold mb-2 text-center">QR Code</h4>
                                        <img
                                          src={app.qr_code_data_url}
                                          alt="QR Code"
                                          className="w-40 h-40 rounded-lg border border-border"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </Section>
        </TabsContent>
      </Tabs>

      {/* QR Generator Modal */}
      <Modal
        isOpen={showQRModal}
        onClose={() => {
          setShowQRModal(false)
          setCreditAmount('')
          setPlanningRef('')
        }}
        title="Generate Planning QR Code"
        description="Lock credits for a planning application"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowQRModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateQR} loading={generating} disabled={!creditAmount}>
              Generate QR
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Catchment"
              value={selectedCatchment}
              onChange={(e) => setSelectedCatchment(e.target.value)}
              options={CATCHMENTS.map(c => ({ value: c, label: c }))}
            />
            <Select
              label="Unit Type"
              value={selectedUnitType}
              onChange={(e) => setSelectedUnitType(e.target.value)}
              options={UNIT_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            />
          </div>
          
          {selectedBalance && (
            <Card variant="glass" padding="sm">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-muted">Available Credits</span>
                <span className="font-mono font-semibold text-accent-primary">
                  {formatCredits(selectedBalance.available_credits)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-text-muted">Available Tonnage</span>
                <span className="font-mono text-sm text-text-secondary">
                  {formatTonnage(selectedBalance.available_tonnes)}
                </span>
              </div>
            </Card>
          )}
          
          <Input
            label="Credits to Lock"
            type="number"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            placeholder="Enter credit amount"
            hint={creditAmount ? `= ${formatTonnage(parseFloat(creditAmount) / 100000)} tonnes` : undefined}
          />
          
          <Input
            label="Planning Reference (Optional)"
            value={planningRef}
            onChange={(e) => setPlanningRef(e.target.value)}
            placeholder="e.g., PL/2026/001"
          />
        </div>
      </Modal>
    </AppShell>
  )
}

export default Developer
