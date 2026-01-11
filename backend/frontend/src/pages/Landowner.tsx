import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppShell, Section } from '../components/layout'
import { Button, Card, Badge, getStatusVariant, Modal, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '../components/ui'
import { StatCard, StatsGrid, NotificationBanner } from '../components/domain'
import { cn, formatCredits } from '../lib/utils'
import { API_BASE_URL } from '../api/config'
const MOCK_LANDOWNER_ACCOUNT_ID = 1

// Helper to replace legacy NFT terminology with Digital Certificate
const formatNotificationMessage = (message: string): string => {
  return message
    .replace(/minted as an NFT/gi, 'issued as a Digital Certificate')
    .replace(/NFT Details/gi, 'Certificate Details')
    .replace(/NFT is now/gi, 'Digital Certificate is now')
    .replace(/The NFT/gi, 'The Digital Certificate')
    .replace(/Token ID:/gi, 'Certificate ID:')
}

// Types
interface Notification {
  id: number
  scheme_id: number | null
  notification_type: string
  message: string
  claim_token: string | null
  is_read: number
  is_used: number
  created_at: string
}

interface Holding {
  scheme_id: number
  scheme_name: string
  catchment: string
  unit_type: string
  credits: number
  original_credits?: number
  available_credits?: number
  tonnes: number
  assigned_credits?: number
  locked_credits?: number
  remaining_credits?: number
  trading_account_credits?: number
  sold_credits?: number
}


function Landowner() {
  // State
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHoldings, setLoadingHoldings] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all')
  
  // Modal states
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [assignAmount, setAssignAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  
  // Notification detail modal
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  
  // Cash balance
  const [cashBalance, setCashBalance] = useState(0)

  // Fetch functions
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE_URL}/landowner/notifications?account_id=${MOCK_LANDOWNER_ACCOUNT_ID}`)
      if (res.ok) setNotifications(await res.json())
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHoldings = async () => {
    try {
      setLoadingHoldings(true)
      const res = await fetch(`${API_BASE_URL}/accounts/${MOCK_LANDOWNER_ACCOUNT_ID}/credits-summary`)
      if (res.ok) {
        const data = await res.json()
        setHoldings(data.holdings || [])
      }
    } catch (err) {
      console.error('Failed to fetch holdings:', err)
    } finally {
      setLoadingHoldings(false)
    }
  }

  const fetchCashBalance = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${MOCK_LANDOWNER_ACCOUNT_ID}/balance`)
      if (res.ok) {
        const data = await res.json()
        setCashBalance(data.balance_gbp || 0)
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    fetchHoldings()
    fetchCashBalance()
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchHoldings()
      fetchCashBalance()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Action handlers
  const handleViewNotification = async (notification: Notification) => {
    setSelectedNotification(notification)
    setShowNotificationModal(true)
    
    // Mark as read if unread
    if (notification.is_read === 0) {
      try {
        await fetch(`${API_BASE_URL}/landowner/notifications/${notification.id}/read`, {
          method: 'POST',
        })
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: 1 } : n)
        )
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    }
  }

  const handleRedeem = async (notification: Notification) => {
    if (!notification.claim_token || notification.is_used === 1) return
    
    try {
      setProcessing(true)
      const res = await fetch(`${API_BASE_URL}/landowner/redeem-scheme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_token: notification.claim_token,
          landowner_account_id: MOCK_LANDOWNER_ACCOUNT_ID,
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Scheme redeemed successfully!' })
        fetchNotifications()
        fetchHoldings()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Failed to redeem' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const handleTransfer = async () => {
    if (!selectedHolding || !transferAmount) return
    const amount = parseInt(transferAmount)
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid amount' })
      return
    }
    
    try {
      setProcessing(true)
      const res = await fetch(`${API_BASE_URL}/landowner/transfer-to-trading-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landowner_account_id: MOCK_LANDOWNER_ACCOUNT_ID,
          scheme_id: selectedHolding.scheme_id,
          credits_amount: amount,
          trading_account_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Credits transferred to trading account!' })
        setShowTransferModal(false)
        setTransferAmount('')
        setSelectedHolding(null)
        fetchHoldings()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Transfer failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedHolding || !assignAmount) return
    const amount = parseInt(assignAmount)
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid amount' })
      return
    }
    
    try {
      setProcessing(true)
      const res = await fetch(`${API_BASE_URL}/landowner/assign-to-broker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landowner_account_id: MOCK_LANDOWNER_ACCOUNT_ID,
          broker_account_id: 4, // Mike Broker
          scheme_id: selectedHolding.scheme_id,
          credits_amount: amount,
          fee_percentage: 5.0,
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Credits assigned to broker!' })
        setShowAssignModal(false)
        setAssignAmount('')
        setSelectedHolding(null)
        fetchHoldings()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Assignment failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  // Computed values
  const totalCredits = holdings.reduce((sum, h) => sum + (h.original_credits || h.credits || 0), 0)
  const totalAssigned = holdings.reduce((sum, h) => sum + (h.assigned_credits || 0), 0)
  const totalAvailable = holdings.reduce((sum, h) => sum + (h.remaining_credits || h.credits || 0), 0)
  const filteredNotifications = notificationFilter === 'unread' 
    ? notifications.filter(n => n.is_read === 0) 
    : notifications

  return (
    <AppShell
      title="Landowner Dashboard"
      subtitle="Manage your offset schemes and credits"
      actions={
        <div className="flex gap-3">
          <Link to="/exchange" state={{ role: 'landowner' }}>
            <Button variant="secondary">Exchange</Button>
          </Link>
          <Link to="/submission-portal">
            <Button>Submit New Scheme</Button>
          </Link>
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
      <StatsGrid columns={4} className="mb-8">
        <StatCard label="Cash Balance" value={cashBalance} format="currency" variant="success" />
        <StatCard label="Total Credits" value={totalCredits} format="credits" />
        <StatCard label="Assigned to Broker" value={totalAssigned} format="credits" variant="warning" />
        <StatCard label="Available" value={totalAvailable} format="credits" variant="primary" />
      </StatsGrid>

      {/* Notifications Section */}
      <Section
        title="Notifications"
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={notificationFilter === 'all' ? 'primary' : 'ghost'}
              onClick={() => setNotificationFilter('all')}
            >
              All ({notifications.length})
            </Button>
            <Button
              size="sm"
              variant={notificationFilter === 'unread' ? 'primary' : 'ghost'}
              onClick={() => setNotificationFilter('unread')}
            >
              Unread ({notifications.filter(n => n.is_read === 0).length})
            </Button>
          </div>
        }
      >
        <Card padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead align="center">Status</TableHead>
                <TableHead align="center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-text-muted">
                    Loading notifications...
                  </TableCell>
                </TableRow>
              ) : filteredNotifications.length === 0 ? (
                <TableEmpty title="No notifications" description="You're all caught up!" />
              ) : (
                filteredNotifications.map((n) => (
                  <TableRow key={n.id} className={cn(n.is_read === 0 && 'bg-background-elevated/30')}>
                    <TableCell>
                      <Badge variant={getStatusVariant(n.notification_type.replace('_', ' '))}>
                        {n.notification_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn('text-sm', n.is_read === 0 && 'font-medium')}>
                        {formatNotificationMessage(n.message).length > 80 
                          ? `${formatNotificationMessage(n.message).slice(0, 80)}...` 
                          : formatNotificationMessage(n.message)}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-muted text-sm">
                      {new Date(n.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      {n.is_read === 0 && (
                        <span className="inline-block w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                      )}
                      {n.is_used === 1 && <Badge variant="success">Redeemed</Badge>}
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleViewNotification(n)}
                        >
                          View
                        </Button>
                        {n.notification_type === 'REDEEM_TO_CREDITS' && n.is_used === 0 && (
                          <Button size="sm" onClick={() => handleRedeem(n)} loading={processing}>
                            Redeem
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </Section>

      {/* Holdings Section */}
      <Section title="My Holdings" description="Your credit holdings across all schemes">
        <Card padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scheme</TableHead>
                <TableHead>Catchment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead align="right">Total</TableHead>
                <TableHead align="right">Assigned</TableHead>
                <TableHead align="right">Trading</TableHead>
                <TableHead align="right">Available</TableHead>
                <TableHead align="center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingHoldings ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-text-muted">
                    Loading holdings...
                  </TableCell>
                </TableRow>
              ) : holdings.length === 0 ? (
                <TableEmpty
                  title="No holdings yet"
                  description="Submit a scheme and redeem it to see your credits here"
                  action={
                    <Link to="/submission-portal">
                      <Button size="sm">Submit Scheme</Button>
                    </Link>
                  }
                />
              ) : (
                holdings.map((h) => {
                  const remaining = h.remaining_credits ?? (h.credits - (h.locked_credits || 0) - (h.assigned_credits || 0))
                  const tradingCredits = h.trading_account_credits || 0
                  
                  return (
                    <TableRow key={h.scheme_id}>
                      <TableCell className="font-medium">{h.scheme_name}</TableCell>
                      <TableCell>
                        <Badge variant="info">{h.catchment}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{h.unit_type}</TableCell>
                      <TableCell align="right" mono>{formatCredits(h.original_credits || h.credits)}</TableCell>
                      <TableCell align="right" mono className="text-status-warning">
                        {formatCredits(h.assigned_credits || 0)}
                      </TableCell>
                      <TableCell align="right" mono className="text-accent-secondary">
                        {formatCredits(tradingCredits)}
                      </TableCell>
                      <TableCell align="right" mono className="text-status-success font-semibold">
                        {formatCredits(remaining)}
                      </TableCell>
                      <TableCell align="center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={remaining <= 0}
                            onClick={() => {
                              setSelectedHolding(h)
                              setShowTransferModal(true)
                            }}
                          >
                            Transfer
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={remaining <= 0}
                            onClick={() => {
                              setSelectedHolding(h)
                              setShowAssignModal(true)
                            }}
                          >
                            Assign
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </Section>

      {/* Transfer Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false)
          setTransferAmount('')
          setSelectedHolding(null)
        }}
        title="Transfer to Trading Account"
        description="Transfer credits to your trading account for active trading"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} loading={processing} disabled={!transferAmount}>
              Transfer
            </Button>
          </>
        }
      >
        {selectedHolding && (
          <div className="space-y-4">
            <Card variant="elevated" padding="sm">
              <p className="text-sm text-text-muted">Scheme</p>
              <p className="font-semibold text-text-primary">{selectedHolding.scheme_name}</p>
              <p className="text-xs text-text-muted mt-1">
                {selectedHolding.catchment} • {selectedHolding.unit_type}
              </p>
            </Card>
            
            <Input
              label="Credits to Transfer"
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="Enter amount"
              hint={`Available: ${formatCredits(selectedHolding.remaining_credits || selectedHolding.credits)}`}
            />
          </div>
        )}
      </Modal>

      {/* Assign Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          setAssignAmount('')
          setSelectedHolding(null)
        }}
        title="Assign to Broker"
        description="Assign credits to a broker for professional management (5% fee)"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} loading={processing} disabled={!assignAmount}>
              Assign Credits
            </Button>
          </>
        }
      >
        {selectedHolding && (
          <div className="space-y-4">
            <Card variant="elevated" padding="sm">
              <p className="text-sm text-text-muted">Scheme</p>
              <p className="font-semibold text-text-primary">{selectedHolding.scheme_name}</p>
              <p className="text-xs text-text-muted mt-1">
                {selectedHolding.catchment} • {selectedHolding.unit_type}
              </p>
            </Card>
            
            <Input
              label="Credits to Assign"
              type="number"
              value={assignAmount}
              onChange={(e) => setAssignAmount(e.target.value)}
              placeholder="Enter amount"
              hint={`Available: ${formatCredits(selectedHolding.remaining_credits || selectedHolding.credits)}`}
            />
            
            {assignAmount && !isNaN(parseInt(assignAmount)) && (
              <Card variant="glass" padding="sm">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Broker Fee (5%)</span>
                  <span className="text-status-warning">{formatCredits(Math.floor(parseInt(assignAmount) * 0.05))}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-text-muted">Net to Broker</span>
                  <span className="text-text-primary">{formatCredits(Math.floor(parseInt(assignAmount) * 0.95))}</span>
                </div>
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* Notification Detail Modal */}
      <Modal
        isOpen={showNotificationModal}
        onClose={() => {
          setShowNotificationModal(false)
          setSelectedNotification(null)
        }}
        title="Notification Details"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setShowNotificationModal(false)
              setSelectedNotification(null)
            }}>
              Close
            </Button>
            {selectedNotification?.notification_type === 'REDEEM_TO_CREDITS' && selectedNotification?.is_used === 0 && (
              <Button 
                onClick={() => {
                  if (selectedNotification) {
                    handleRedeem(selectedNotification)
                    setShowNotificationModal(false)
                    setSelectedNotification(null)
                  }
                }} 
                loading={processing}
              >
                Redeem Credits
              </Button>
            )}
          </>
        }
      >
        {selectedNotification && (
          <div className="space-y-4">
            {/* Notification Type Badge */}
            <div className="flex items-center gap-3">
              <Badge variant={getStatusVariant(selectedNotification.notification_type.replace('_', ' '))}>
                {selectedNotification.notification_type.replace(/_/g, ' ')}
              </Badge>
              {selectedNotification.is_used === 1 && (
                <Badge variant="success">Redeemed</Badge>
              )}
              {selectedNotification.is_read === 0 && (
                <Badge variant="info">New</Badge>
              )}
            </div>

            {/* Message */}
            <Card variant="glass">
              <h4 className="text-sm font-medium text-text-muted mb-2">Message</h4>
              <p className="text-text-primary whitespace-pre-line">{formatNotificationMessage(selectedNotification.message)}</p>
            </Card>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card variant="glass" padding="sm">
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Date</p>
                <p className="font-medium">
                  {new Date(selectedNotification.created_at).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-text-muted">
                  {new Date(selectedNotification.created_at).toLocaleTimeString('en-GB')}
                </p>
              </Card>

              {selectedNotification.scheme_id && (
                <Card variant="glass" padding="sm">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Scheme ID</p>
                  <p className="font-mono font-medium">#{selectedNotification.scheme_id}</p>
                </Card>
              )}
            </div>

            {/* Claim Token (if applicable) */}
            {selectedNotification.claim_token && (
              <Card variant="elevated" padding="sm">
                <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Claim Token</p>
                <code className="block p-2 bg-background-deep rounded text-sm font-mono break-all">
                  {selectedNotification.claim_token}
                </code>
                {selectedNotification.is_used === 0 && (
                  <p className="text-xs text-status-warning mt-2">
                    This token can be redeemed to claim your credits.
                  </p>
                )}
              </Card>
            )}
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

export default Landowner
