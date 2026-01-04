import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell, Section } from '../components/layout'
import { 
  Button, Card, CardHeader, Badge, getStatusVariant, Modal, Input, Select, 
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, 
  Tabs, TabsList, TabsTrigger, TabsContent 
} from '../components/ui'
import { StatCard, StatsGrid, NotificationBanner } from '../components/domain'
import { formatGBP, formatCredits, creditsToTonnes } from '../lib/utils'

const API_BASE_URL = 'http://localhost:8000'
const BROKER_ACCOUNT_ID = 4

const CATCHMENTS = ['SOLENT', 'THAMES', 'SEVERN', 'HUMBER', 'MERSEY', 'TEES', 'TYNE', 'WESSEX']
const UNIT_TYPES = ['nitrate', 'phosphate']

// Types
interface Mandate {
  mandate_id: number
  landowner_id: number
  landowner_name: string
  scheme_id: number
  scheme_name: string
  catchment: string
  unit_type: string
  total_credits: number
    client_credits: number
    fee_credits: number
  fee_percentage: number
  is_active: boolean
  is_recalled: boolean
  created_at: string
}

interface HouseHolding {
  scheme_id: number
  nft_token_id: number
  scheme_name: string
  catchment: string
  unit_type: string
  credits: number
  tonnes: number
  locked_credits: number
  available_credits: number
  landowner_names: string
  received_date: string
  total_fees: number
}

interface Bot {
  id: number
  broker_account_id: number
  catchment: string
  unit_type: string
  name: string
  is_active: boolean
  strategy_config: {
    base_price?: number
    spread_percent?: number
    min_order_size?: number
    max_order_size?: number
    price_levels?: number
    price_step?: number
    credits_per_level?: number
  }
  created_at: string
  updated_at: string
}

interface BotAssignment {
  id: number
  bot_id: number
  mandate_id: number | null
  is_house_account: boolean
  priority_order: number
  assigned_at: string
  is_active: boolean
}

interface MandateTrade {
  id: number
  buyer_account_id: number
  seller_account_id: number
  scheme_id: number
  quantity_units: number
  price_per_unit: number
  total_price: number
  created_at: string
}

function Broker() {
  const [activeTab, setActiveTab] = useState('mandates')
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [houseHoldings, setHouseHoldings] = useState<HouseHolding[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [sellLadderBots, setSellLadderBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Create bot modal
  const [showBotModal, setShowBotModal] = useState(false)
  const [botType, setBotType] = useState<'market-making' | 'sell-ladder'>('sell-ladder')
  const [botName, setBotName] = useState('')
  const [botCatchment, setBotCatchment] = useState('')
  const [botUnitType, setBotUnitType] = useState('')
  const [botBasePrice, setBotBasePrice] = useState('')
  const [botPriceLevels, setBotPriceLevels] = useState('5')
  const [botPriceStep, setBotPriceStep] = useState('500')
  const [botCreditsPerLevel, setBotCreditsPerLevel] = useState('100000')
  
  // Bot detail modal
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null)
  const [showBotDetailModal, setShowBotDetailModal] = useState(false)
  const [botAssignments, setBotAssignments] = useState<BotAssignment[]>([])
  
  // Balance
  const [balance, setBalance] = useState(0)
  const [processing, setProcessing] = useState(false)
  
  // Expanded mandates for PnL view
  const [expandedMandates, setExpandedMandates] = useState<Set<number>>(new Set())
  const [mandateTrades, setMandateTrades] = useState<Record<number, MandateTrade[]>>({})

  // Fetch data
  const fetchMandates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/mandates`)
      if (res.ok) {
        const data = await res.json()
        setMandates(data.mandates?.filter((m: Mandate) => !m.is_recalled) || [])
      }
    } catch (err) {
      console.error('Failed to fetch mandates:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHouseHoldings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/house-holdings`)
      if (res.ok) {
        const data = await res.json()
        setHouseHoldings(data.holdings || [])
      }
    } catch (err) {
      console.error('Failed to fetch house holdings:', err)
    }
  }

  const fetchBots = async () => {
    try {
      // Fetch market making bots
      const mmRes = await fetch(`${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/bots`)
      if (mmRes.ok) {
        const data = await mmRes.json()
        setBots(data || [])
      }
      
      // Fetch sell ladder bots
      const slRes = await fetch(`${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/sell-ladder-bots`)
      if (slRes.ok) {
        const data = await slRes.json()
        setSellLadderBots(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch bots:', err)
    }
  }

  const fetchBalance = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${BROKER_ACCOUNT_ID}/balance`)
      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance_gbp || 0)
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    }
  }

  const fetchBotAssignments = async (botId: number, botType: 'mm' | 'sl') => {
    try {
      const endpoint = botType === 'mm' 
        ? `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/bots/${botId}/assignments`
        : `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/sell-ladder-bots/${botId}/assignments`
      const res = await fetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        setBotAssignments(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch bot assignments:', err)
    }
  }

  // Fetch trades for a specific mandate's scheme
  const fetchMandateTrades = async (mandate: Mandate) => {
    try {
      // Fetch trades for this scheme where broker was seller
      const res = await fetch(`${API_BASE_URL}/exchange/trades?account_id=${BROKER_ACCOUNT_ID}&limit=50`)
      if (res.ok) {
        const allTrades = await res.json()
        // Filter trades for this specific scheme
        const schemeTrades = allTrades.filter((t: MandateTrade) => 
          t.scheme_id === mandate.scheme_id && t.seller_account_id === BROKER_ACCOUNT_ID
        )
        setMandateTrades(prev => ({ ...prev, [mandate.mandate_id]: schemeTrades }))
      }
    } catch (err) {
      console.error('Failed to fetch mandate trades:', err)
    }
  }

  // Toggle mandate expansion
  const toggleMandate = async (mandate: Mandate) => {
    const newExpanded = new Set(expandedMandates)
    if (newExpanded.has(mandate.mandate_id)) {
      newExpanded.delete(mandate.mandate_id)
      } else {
      newExpanded.add(mandate.mandate_id)
      // Fetch trades if not already loaded
      if (!mandateTrades[mandate.mandate_id]) {
        await fetchMandateTrades(mandate)
      }
    }
    setExpandedMandates(newExpanded)
  }

  useEffect(() => {
    fetchMandates()
    fetchHouseHoldings()
    fetchBots()
    fetchBalance()
    
    const interval = setInterval(() => {
      fetchMandates()
      fetchHouseHoldings()
      fetchBots()
      fetchBalance()
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Create bot
  const handleCreateBot = async () => {
    if (!botName || !botCatchment || !botUnitType || !botBasePrice) {
      setMessage({ type: 'error', text: 'Please fill all required fields' })
      return
    }
    
    // Use correct field names that backend expects for sell ladder bots
    const strategyConfig = botType === 'sell-ladder' ? {
      base_price_per_tonne: parseFloat(botBasePrice),
      num_price_levels: parseInt(botPriceLevels),
      price_increment_percentage: parseFloat(botPriceStep),
      order_size_per_level: parseInt(botCreditsPerLevel),
      min_order_size_credits: 1000,
      max_order_size_credits: 1000000,
    } : {
      // Market making bots use different field names
      base_price: parseFloat(botBasePrice),
      price_levels: parseInt(botPriceLevels),
      price_step: parseFloat(botPriceStep),
      credits_per_level: parseInt(botCreditsPerLevel),
    }
    
    try {
      setProcessing(true)
      const endpoint = botType === 'market-making'
        ? `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/bots`
        : `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/sell-ladder-bots`
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: botName,
          catchment: botCatchment,
          unit_type: botUnitType,
          strategy_config: strategyConfig,
        }),
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: `${botType === 'market-making' ? 'Market Making' : 'Sell Ladder'} Bot created!` })
        setShowBotModal(false)
        resetBotForm()
        fetchBots()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Failed to create bot' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const resetBotForm = () => {
    setBotName('')
    setBotCatchment('')
    setBotUnitType('')
    setBotBasePrice('')
    setBotPriceLevels('5')
    setBotPriceStep('500')
    setBotCreditsPerLevel('100000')
  }

  // Bot actions
  const handleActivateBot = async (bot: Bot, type: 'mm' | 'sl') => {
    try {
      setProcessing(true)
      const endpoint = type === 'mm'
        ? `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/bots/${bot.id}/activate`
        : `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/sell-ladder-bots/${bot.id}/activate`
      
      const res = await fetch(endpoint, { method: 'POST' })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Bot activated!' })
        fetchBots()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Failed to activate' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const handleDeactivateBot = async (bot: Bot, type: 'mm' | 'sl') => {
    try {
      setProcessing(true)
      const endpoint = type === 'mm'
        ? `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/bots/${bot.id}/deactivate`
        : `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/sell-ladder-bots/${bot.id}/deactivate`
      
      const res = await fetch(endpoint, { method: 'POST' })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Bot deactivated' })
        fetchBots()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Failed to deactivate' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const handleAssignHouse = async (bot: Bot, type: 'mm' | 'sl') => {
    try {
      setProcessing(true)
      const endpoint = type === 'mm'
        ? `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/bots/${bot.id}/assign-house`
        : `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/sell-ladder-bots/${bot.id}/assign-house`
      
      const res = await fetch(endpoint, { method: 'POST' })
      if (res.ok) {
        setMessage({ type: 'success', text: 'House account assigned to bot!' })
        if (selectedBot) fetchBotAssignments(selectedBot.id, type)
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Failed to assign house' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const handleAssignMandate = async (bot: Bot, mandateId: number, type: 'mm' | 'sl') => {
    try {
      setProcessing(true)
      const endpoint = type === 'mm'
        ? `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/bots/${bot.id}/assign-client`
        : `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/sell-ladder-bots/${bot.id}/assign-client`
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mandate_id: mandateId }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Client mandate assigned to bot!' })
        if (selectedBot) fetchBotAssignments(selectedBot.id, type)
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Failed to assign mandate' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const handlePlaceOrders = async (bot: Bot, type: 'mm' | 'sl') => {
    try {
      setProcessing(true)
      const endpoint = type === 'mm'
        ? `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/bots/${bot.id}/place-orders`
        : `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/sell-ladder-bots/${bot.id}/place-orders`
      
      const res = await fetch(endpoint, { method: 'POST' })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Orders placed!' })
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Failed to place orders' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteBot = async (bot: Bot, type: 'mm' | 'sl') => {
    if (!confirm(`Are you sure you want to delete "${bot.name}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      setProcessing(true)
      const endpoint = type === 'mm'
        ? `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/bots/${bot.id}`
        : `${API_BASE_URL}/broker/${BROKER_ACCOUNT_ID}/sell-ladder-bots/${bot.id}`
      
      const res = await fetch(endpoint, { method: 'DELETE' })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Bot deleted successfully' })
        fetchBots()
        // Close detail modal if it's open for this bot
        if (selectedBot?.id === bot.id) {
          setShowBotDetailModal(false)
          setSelectedBot(null)
        }
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Failed to delete bot' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const openBotDetail = async (bot: Bot, type: 'mm' | 'sl') => {
    setSelectedBot(bot)
    await fetchBotAssignments(bot.id, type)
    setShowBotDetailModal(true)
  }

  // Computed values
  const totalClientCredits = mandates.reduce((sum, m) => sum + m.client_credits, 0)
  const totalHouseCredits = houseHoldings.reduce((sum, h) => sum + h.available_credits, 0)
  const totalActiveBots = bots.filter(b => b.is_active).length + sellLadderBots.filter(b => b.is_active).length
  const allBots = [...bots.map(b => ({ ...b, type: 'mm' as const })), ...sellLadderBots.map(b => ({ ...b, type: 'sl' as const }))]

  return (
    <AppShell
        title="Broker Dashboard" 
      subtitle="Manage client portfolios, house holdings, and trading bots"
      actions={
        <div className="flex gap-3">
          <Link to="/exchange" state={{ role: 'broker' }}>
            <Button variant="secondary">Exchange</Button>
          </Link>
          <Button onClick={() => setShowBotModal(true)}>
            Create Bot
          </Button>
        </div>
      }
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
        <StatCard label="Cash Balance" value={balance} format="currency" variant="success" />
        <StatCard label="Client Credits" value={totalClientCredits} format="credits" />
        <StatCard label="House Credits (5%)" value={totalHouseCredits} format="credits" variant="primary" />
        <StatCard label="Active Bots" value={totalActiveBots} variant="info" />
      </StatsGrid>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="underline">
          <TabsTrigger value="mandates" variant="underline">
            Client Mandates ({mandates.length})
          </TabsTrigger>
          <TabsTrigger value="house" variant="underline">
            House Holdings ({houseHoldings.length})
          </TabsTrigger>
          <TabsTrigger value="bots" variant="underline">
            Trading Bots ({allBots.length})
          </TabsTrigger>
        </TabsList>

        {/* Client Mandates Tab */}
        <TabsContent value="mandates">
          <Section title="Client Mandates" description="Credits assigned by landowners for trading (you receive 5% fee on assignment)">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Catchment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead align="right">Total Assigned</TableHead>
                    <TableHead align="right">Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
      {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-[var(--color-text-muted)]">
                        Loading mandates...
                      </TableCell>
                    </TableRow>
                  ) : mandates.length === 0 ? (
                    <TableEmpty
                      title="No active mandates"
                      description="Landowners can assign credits to you for trading"
                    />
                  ) : (
                    mandates.map((mandate) => {
                      const isExpanded = expandedMandates.has(mandate.mandate_id)
                      const trades = mandateTrades[mandate.mandate_id] || []
                      const totalSales = trades.reduce((sum, t) => sum + t.total_price, 0)
                      const totalCreditsSold = trades.reduce((sum, t) => sum + t.quantity_units, 0)

                        return (
                          <>
                          <TableRow 
                            key={mandate.mandate_id}
                            className="cursor-pointer hover:bg-[var(--color-background-elevated)]"
                            onClick={() => toggleMandate(mandate)}
                          >
                            <TableCell className="w-10">
                              <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </motion.div>
                            </TableCell>
                            <TableCell className="font-medium">{mandate.landowner_name}</TableCell>
                            <TableCell>{mandate.scheme_name}</TableCell>
                            <TableCell><Badge variant="info">{mandate.catchment}</Badge></TableCell>
                            <TableCell className="capitalize">{mandate.unit_type}</TableCell>
                            <TableCell align="right" mono>{formatCredits(mandate.total_credits)}</TableCell>
                            <TableCell align="right" mono className="text-[var(--color-accent-primary)] font-semibold">
                              {formatCredits(mandate.client_credits)}
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded PnL Section */}
                          <AnimatePresence>
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} className="p-0">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden bg-[var(--color-background-elevated)]/50 border-t border-[var(--color-border)]"
                                  >
                                    <div className="p-4">
                                      <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                                        Sales History for {mandate.landowner_name}
                                      </h4>
                                      
                                      {trades.length === 0 ? (
                                        <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
                                          No sales yet for this client's credits
                </p>
              ) : (
                                        <>
                                          <div className="space-y-2 mb-4">
                                            {trades.map((trade) => (
                                              <div 
                                                key={trade.id}
                                                className="flex items-center justify-between p-3 bg-[var(--color-background-surface)] rounded-lg"
                                              >
                                                <div className="flex items-center gap-4">
                                                  <span className="text-sm text-[var(--color-text-muted)]">
                                                    {new Date(trade.created_at).toLocaleDateString()}
                            </span>
                                                  <span className="font-mono text-sm">
                                                    {formatCredits(trade.quantity_units)} credits
                                                  </span>
                                                  <span className="text-sm text-[var(--color-text-muted)]">
                                                    @ {formatGBP(trade.price_per_unit)}/t
                                                  </span>
                        </div>
                                                <span className="font-mono font-semibold text-[var(--color-status-success)]">
                                                  +{formatGBP(trade.total_price)}
                                                </span>
                        </div>
                                            ))}
                      </div>
                      
                                          {/* Total Summary */}
                                          <div className="flex items-center justify-between p-4 bg-[var(--color-status-success)]/10 rounded-lg border border-[var(--color-status-success)]/30">
                              <div>
                                              <p className="text-sm text-[var(--color-text-muted)]">Total Credits Sold</p>
                                              <p className="font-mono font-semibold">{formatCredits(totalCreditsSold)}</p>
                              </div>
                                            <div className="text-right">
                                              <p className="text-sm text-[var(--color-text-muted)]">Total Sales Revenue</p>
                                              <p className="text-xl font-mono font-bold text-[var(--color-status-success)]">
                                                {formatGBP(totalSales)}
                                              </p>
                            </div>
                                          </div>
                                        </>
                            )}
                          </div>
                                  </motion.div>
                                      </td>
                                    </tr>
                            )}
                          </AnimatePresence>
                        </>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </Section>
        </TabsContent>

        {/* House Holdings Tab */}
        <TabsContent value="house">
          <Section title="House Holdings" description="5% fee credits accumulated from mandate assignments - pure profit when sold">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Catchment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>From Landowners</TableHead>
                    <TableHead align="right">Total Fees</TableHead>
                    <TableHead align="right">Available</TableHead>
                    <TableHead align="right">Tonnes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {houseHoldings.length === 0 ? (
                    <TableEmpty
                      title="No house holdings yet"
                      description="House credits appear when landowners assign mandates (5% fee)"
                    />
                  ) : (
                    houseHoldings.map((holding) => (
                      <TableRow key={holding.scheme_id}>
                        <TableCell className="font-medium">{holding.scheme_name}</TableCell>
                        <TableCell><Badge variant="info">{holding.catchment}</Badge></TableCell>
                        <TableCell className="capitalize">{holding.unit_type}</TableCell>
                        <TableCell className="text-[var(--color-text-muted)]">{holding.landowner_names}</TableCell>
                        <TableCell align="right" mono>{formatCredits(holding.total_fees)}</TableCell>
                        <TableCell align="right" mono className="text-[var(--color-status-success)] font-semibold">
                          {formatCredits(holding.available_credits)}
                        </TableCell>
                        <TableCell align="right" mono className="text-[var(--color-text-muted)]">
                          {creditsToTonnes(holding.available_credits).toFixed(4)}t
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
            
            {houseHoldings.length > 0 && (
              <Card variant="glass" className="mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Total House Credits (Pure Profit)</p>
                    <p className="text-2xl font-bold text-[var(--color-status-success)]">{formatCredits(totalHouseCredits)}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{creditsToTonnes(totalHouseCredits).toFixed(4)} tonnes</p>
                        </div>
                  <div className="text-right">
                    <p className="text-sm text-[var(--color-text-muted)]">These are your fee credits from mandate assignments</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Assign to a bot via the Trading Bots tab</p>
                        </div>
                    </div>
              </Card>
            )}
          </Section>
        </TabsContent>

        {/* Bots Tab */}
        <TabsContent value="bots">
          <Section 
            title="Trading Bots" 
            description="Automated trading strategies for client and house credits"
            action={
              <Button onClick={() => setShowBotModal(true)}>
                Create Bot
              </Button>
            }
          >
            {allBots.length === 0 ? (
              <Card className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No Trading Bots</h3>
                <p className="text-[var(--color-text-muted)] mb-4">Create a bot to automate your trading strategies</p>
                <Button onClick={() => setShowBotModal(true)}>Create Your First Bot</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allBots.map((bot) => (
                  <motion.div
                    key={`${bot.type}-${bot.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card hover className="h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Badge variant={bot.type === 'mm' ? 'info' : 'primary'} size="sm">
                            {bot.type === 'mm' ? 'Market Making' : 'Sell Ladder'}
                          </Badge>
                            </div>
                        <Badge variant={bot.is_active ? 'success' : 'neutral'} dot>
                          {bot.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                              </div>
                              
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{bot.name}</h3>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                                  <div>
                          <p className="text-[var(--color-text-muted)]">Catchment</p>
                          <Badge variant="info" size="sm">{bot.catchment}</Badge>
                                  </div>
                        <div>
                          <p className="text-[var(--color-text-muted)]">Type</p>
                          <p className="capitalize">{bot.unit_type}</p>
                                </div>
                        <div>
                          <p className="text-[var(--color-text-muted)]">Base Price</p>
                          <p className="font-mono">{formatGBP(bot.strategy_config.base_price_per_tonne || bot.strategy_config.base_price || 0)}</p>
                              </div>
                        <div>
                          <p className="text-[var(--color-text-muted)]">Levels</p>
                          <p>{bot.strategy_config.num_price_levels || bot.strategy_config.price_levels || 5}</p>
                            </div>
                        </div>
                      
                      <div className="flex gap-2 pt-3 border-t border-[var(--color-border)]">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1"
                          onClick={() => openBotDetail(bot, bot.type)}
                        >
                          Configure
                        </Button>
                        {bot.is_active ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeactivateBot(bot, bot.type)}
                            loading={processing}
                          >
                            Stop
                          </Button>
            ) : (
              <>
                            <Button
                              size="sm"
                              onClick={() => handleActivateBot(bot, bot.type)}
                              loading={processing}
                            >
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[var(--color-status-error)] hover:bg-[var(--color-status-error)]/10"
                              onClick={() => handleDeleteBot(bot, bot.type)}
                              loading={processing}
                              title="Delete bot"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
              </>
            )}
            </div>
                    </Card>
                  </motion.div>
                ))}
        </div>
      )}
          </Section>
        </TabsContent>

        </Tabs>

      {/* Create Bot Modal */}
      <Modal
        isOpen={showBotModal}
        onClose={() => {
          setShowBotModal(false)
          resetBotForm()
        }}
        title="Create Trading Bot"
        description="Set up an automated trading strategy"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowBotModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBot}
              loading={processing}
              disabled={!botName || !botCatchment || !botUnitType || !botBasePrice}
            >
              Create Bot
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Bot Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <Card
              variant={botType === 'sell-ladder' ? 'elevated' : 'default'}
              padding="sm"
              hover
              className={`cursor-pointer transition-all ${botType === 'sell-ladder' ? 'ring-2 ring-[var(--color-accent-primary)]' : ''}`}
              onClick={() => setBotType('sell-ladder')}
            >
              <h4 className="font-semibold mb-1">Sell Ladder Bot</h4>
              <p className="text-sm text-[var(--color-text-muted)]">Places sell orders at multiple price levels</p>
            </Card>
            <Card
              variant={botType === 'market-making' ? 'elevated' : 'default'}
              padding="sm"
              hover
              className={`cursor-pointer transition-all ${botType === 'market-making' ? 'ring-2 ring-[var(--color-accent-primary)]' : ''}`}
              onClick={() => setBotType('market-making')}
            >
              <h4 className="font-semibold mb-1">Market Making Bot</h4>
              <p className="text-sm text-[var(--color-text-muted)]">Places both buy and sell orders</p>
            </Card>
      </div>
      
          <Input
            label="Bot Name"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            placeholder="e.g., SOLENT Nitrate Ladder"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Catchment"
              value={botCatchment}
              onChange={(e) => setBotCatchment(e.target.value)}
              options={CATCHMENTS.map(c => ({ value: c, label: c }))}
              placeholder="Select catchment"
            />
            <Select
              label="Unit Type"
              value={botUnitType}
              onChange={(e) => setBotUnitType(e.target.value)}
              options={UNIT_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
              placeholder="Select type"
            />
          </div>

          <CardHeader title="Strategy Configuration" description="Configure pricing and order sizes" />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Base Price (£/tonne)"
              type="number"
              value={botBasePrice}
              onChange={(e) => setBotBasePrice(e.target.value)}
              placeholder="e.g., 25000"
            />
            <Input
              label="Price Levels"
              type="number"
              value={botPriceLevels}
              onChange={(e) => setBotPriceLevels(e.target.value)}
              hint="Number of price tiers"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={botType === 'sell-ladder' ? "Price Step (%)" : "Price Step (£/tonne)"}
              type="number"
              value={botPriceStep}
              onChange={(e) => setBotPriceStep(e.target.value)}
              hint={botType === 'sell-ladder' ? "Percentage increase per level (e.g. 1.25 = 1.25%)" : "Price increase per level"}
            />
            <Input
              label="Credits per Level"
              type="number"
              value={botCreditsPerLevel}
              onChange={(e) => setBotCreditsPerLevel(e.target.value)}
              hint="Credits at each price level"
            />
          </div>

          {botBasePrice && botPriceLevels && botPriceStep && (
            <Card variant="glass" padding="sm">
              <p className="text-sm font-medium mb-2">Price Ladder Preview (per tonne)</p>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {Array.from({ length: Math.min(parseInt(botPriceLevels) || 5, 5) }).map((_, i) => {
                  const basePrice = parseFloat(botBasePrice) || 0
                  const stepPct = parseFloat(botPriceStep) || 0
                  // For sell ladder: each level increases by percentage
                  const price = botType === 'sell-ladder' 
                    ? basePrice * (1 + (i * stepPct / 100))
                    : basePrice + i * stepPct
                  return (
                    <div key={i} className="text-center p-2 bg-[var(--color-surface-elevated)] rounded">
                      <p className="text-[var(--color-text-muted)]">L{i + 1}</p>
                      <p className="font-mono font-semibold">{formatGBP(price)}</p>
          </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      </Modal>

      {/* Bot Detail Modal */}
      <Modal
        isOpen={showBotDetailModal}
        onClose={() => {
          setShowBotDetailModal(false)
          setSelectedBot(null)
          setBotAssignments([])
        }}
        title={selectedBot?.name || 'Bot Details'}
        size="lg"
        footer={
          selectedBot && (
            <>
              <Button variant="ghost" onClick={() => setShowBotDetailModal(false)}>
                Close
              </Button>
              {!selectedBot.is_active ? (
                <Button
                  onClick={async () => {
                    const type = sellLadderBots.find(b => b.id === selectedBot.id) ? 'sl' : 'mm'
                    await handleActivateBot(selectedBot, type)
                    // Refresh the selected bot after activation
                    fetchBots()
                    const updatedBot = { ...selectedBot, is_active: true }
                    setSelectedBot(updatedBot)
                  }}
                  loading={processing}
                  disabled={botAssignments.length === 0}
                >
                  {botAssignments.length === 0 ? 'Assign Credits First' : 'Activate Bot'}
                </Button>
              ) : (
                <>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      const type = sellLadderBots.find(b => b.id === selectedBot.id) ? 'sl' : 'mm'
                      await handleDeactivateBot(selectedBot, type)
                      fetchBots()
                      const updatedBot = { ...selectedBot, is_active: false }
                      setSelectedBot(updatedBot)
                    }}
                    loading={processing}
                  >
                    Stop Bot
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedBot) {
                        const type = sellLadderBots.find(b => b.id === selectedBot.id) ? 'sl' : 'mm'
                        handlePlaceOrders(selectedBot, type)
                      }
                    }}
                    loading={processing}
                  >
                    Place Orders Now
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {selectedBot && (
          <div className="space-y-6">
            {/* Bot Info */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Status</p>
                <Badge variant={selectedBot.is_active ? 'success' : 'neutral'} dot>
                  {selectedBot.is_active ? 'Active' : 'Inactive'}
                </Badge>
      </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Catchment</p>
                <Badge variant="info">{selectedBot.catchment}</Badge>
      </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Type</p>
                <p className="capitalize">{selectedBot.unit_type}</p>
      </div>
      </div>

            {/* Strategy Config */}
            <Card variant="glass" padding="sm">
              <p className="text-sm font-medium mb-3">Strategy Configuration</p>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[var(--color-text-muted)]">Base Price</p>
                  <p className="font-mono">{formatGBP(selectedBot.strategy_config.base_price_per_tonne || selectedBot.strategy_config.base_price || 0)}</p>
      </div>
                <div>
                  <p className="text-[var(--color-text-muted)]">Price Levels</p>
                  <p>{selectedBot.strategy_config.num_price_levels || selectedBot.strategy_config.price_levels || 5}</p>
      </div>
                <div>
                  <p className="text-[var(--color-text-muted)]">Price Step %</p>
                  <p className="font-mono">{(selectedBot.strategy_config.price_increment_percentage || selectedBot.strategy_config.price_step || 0)}%</p>
      </div>
                <div>
                  <p className="text-[var(--color-text-muted)]">Credits/Level</p>
                  <p className="font-mono">{formatCredits(selectedBot.strategy_config.order_size_per_level || selectedBot.strategy_config.credits_per_level || 0)}</p>
      </div>
      </div>
            </Card>
            
            {/* Assignments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Credit Assignments</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const type = sellLadderBots.find(b => b.id === selectedBot.id) ? 'sl' : 'mm'
                      handleAssignHouse(selectedBot, type)
                    }}
                    loading={processing}
                    disabled={botAssignments.some(a => a.is_house_account)}
                  >
                    Assign House
                  </Button>
      </div>
      </div>

              {botAssignments.length === 0 ? (
                <Card variant="glass" padding="sm" className="text-center">
                  <p className="text-[var(--color-text-muted)]">No credits assigned. Assign house or client mandates to start trading.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {botAssignments.map((assignment) => (
                    <Card key={assignment.id} variant="glass" padding="sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={assignment.is_house_account ? 'primary' : 'info'}>
                            {assignment.is_house_account ? 'House' : 'Client'}
                          </Badge>
                          <span className="text-sm">
                            {assignment.is_house_account 
                              ? 'House Account (5% Fees)' 
                              : `Mandate #${assignment.mandate_id}`}
                          </span>
      </div>
                        <Badge variant={assignment.is_active ? 'success' : 'neutral'} size="sm">
                          {assignment.is_active ? 'Active' : 'Inactive'}
                        </Badge>
      </div>
                    </Card>
                  ))}
      </div>
              )}
              
              {/* Assign Client Mandates */}
              {mandates.filter(m => 
                m.catchment === selectedBot.catchment && 
                m.unit_type === selectedBot.unit_type &&
                !botAssignments.some(a => a.mandate_id === m.mandate_id)
              ).length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-[var(--color-text-muted)] mb-2">Available Mandates to Assign:</p>
                  <div className="space-y-2">
                    {mandates
                      .filter(m => 
                        m.catchment === selectedBot.catchment && 
                        m.unit_type === selectedBot.unit_type &&
                        !botAssignments.some(a => a.mandate_id === m.mandate_id)
                      )
                      .map(mandate => (
                        <Card key={mandate.mandate_id} variant="default" padding="sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{mandate.landowner_name}</span>
                              <span className="text-[var(--color-text-muted)]"> - </span>
                              <span>{mandate.scheme_name}</span>
                              <span className="text-[var(--color-text-muted)] ml-2">
                                ({formatCredits(mandate.client_credits)} avail.)
                              </span>
      </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                const type = sellLadderBots.find(b => b.id === selectedBot.id) ? 'sl' : 'mm'
                                handleAssignMandate(selectedBot, mandate.mandate_id, type)
                              }}
                              loading={processing}
                            >
                              Assign
                            </Button>
      </div>
                        </Card>
                      ))
                    }
      </div>
      </div>
              )}
      </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

export default Broker
