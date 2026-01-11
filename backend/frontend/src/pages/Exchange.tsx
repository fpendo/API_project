import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell, Section } from '../components/layout'
import { 
  Button, Card, CardHeader, Badge, getStatusVariant, Input, Select, 
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Tabs, TabsList, TabsTrigger, TabsContent
} from '../components/ui'
import { StatCard, StatsGrid, NotificationBanner } from '../components/domain'
import { cn, formatGBP, formatCredits, creditsToTonnes } from '../lib/utils'
import { API_BASE_URL } from '../api/config'
const CATCHMENTS = ['SOLENT', 'THAMES', 'SEVERN', 'HUMBER', 'MERSEY', 'TEES', 'TYNE', 'WESSEX']
const UNIT_TYPES = ['nitrate', 'phosphate']

// Types
interface Holding {
  scheme_id: number
  scheme_name: string
  catchment: string
  unit_type: string
  credits: number
  trading_account_credits?: number
  locked_credits?: number
  available_credits?: number
  tonnes: number
}

interface OrderBookEntry {
  price: number
  quantity: number
  total: number
}

interface Order {
  id: number
  account_id: number
  order_type: string
  side: string
  catchment: string
  unit_type: string
  price_per_unit: number | null
  quantity_units: number
  filled_quantity: number
  remaining_quantity: number
  status: string
  scheme_id: number | null
  created_at: string
  updated_at: string
}

interface Trade {
  id: number
  listing_id: number | null
  buyer_account_id: number
  seller_account_id: number
  scheme_id: number
  quantity_units: number
  price_per_unit: number
  total_price: number
  transaction_hash: string | null
  created_at: string
}

function Exchange() {
  const location = useLocation()
  const roleFromState = location.state?.role
  
  // Determine user role and account
  const [role, setRole] = useState<'landowner' | 'developer' | 'broker'>(roleFromState || 'developer')
  const accountId = role === 'landowner' ? 1 : role === 'broker' ? 4 : 5
  
  // State
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookEntry[], asks: OrderBookEntry[] }>({ bids: [], asks: [] })
  const [openOrders, setOpenOrders] = useState<Order[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState('open')
  
  // Filters / Market selection
  const [selectedCatchment, setSelectedCatchment] = useState('SOLENT')
  const [selectedUnitType, setSelectedUnitType] = useState('nitrate')
  
  // Order form
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY')
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT')
  const [orderPrice, setOrderPrice] = useState('')
  const [orderQuantity, setOrderQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Account balance
  const [balance, setBalance] = useState(0)

  // Fetch holdings
  const fetchHoldings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${accountId}/credits-summary`)
      if (res.ok) {
        const data = await res.json()
        setHoldings(data.holdings || [])
      }
    } catch (err) {
      console.error('Failed to fetch holdings:', err)
    }
  }

  // Fetch order book
  const fetchOrderBook = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/exchange/orderbook?catchment=${selectedCatchment}&unit_type=${selectedUnitType}`)
      if (res.ok) {
        const data = await res.json()
        setOrderBook(data)
      }
    } catch (err) {
      console.error('Failed to fetch order book:', err)
    }
  }

  // Fetch open orders
  const fetchOpenOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/exchange/orders/open?account_id=${accountId}`)
      if (res.ok) setOpenOrders(await res.json())
    } catch (err) {
      console.error('Failed to fetch open orders:', err)
    }
  }

  // Fetch trades
  const fetchTrades = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/exchange/trades?account_id=${accountId}&limit=20`)
      if (res.ok) setTrades(await res.json())
    } catch (err) {
      console.error('Failed to fetch trades:', err)
    }
  }

  // Fetch balance
  const fetchBalance = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${accountId}/balance`)
      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance_gbp || 0)
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    }
  }

  useEffect(() => {
    fetchHoldings()
    fetchOrderBook()
    fetchOpenOrders()
    fetchTrades()
    fetchBalance()
    
    const interval = setInterval(() => {
      fetchOrderBook()
      fetchOpenOrders()
      fetchTrades()
      fetchBalance()
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedCatchment, selectedUnitType, accountId])

  // Place order
  const handlePlaceOrder = async () => {
    if (!orderQuantity) {
      setMessage({ type: 'error', text: 'Please enter quantity' })
      return
    }

    if (orderType === 'LIMIT' && !orderPrice) {
      setMessage({ type: 'error', text: 'Please enter price for limit order' })
      return
    }

    const quantity = parseInt(orderQuantity)
    const price = orderType === 'LIMIT' ? parseFloat(orderPrice) : undefined
    
    if (isNaN(quantity) || quantity <= 0) {
      setMessage({ type: 'error', text: 'Invalid quantity' })
      return
    }
    
    if (orderType === 'LIMIT' && (isNaN(price!) || price! <= 0)) {
      setMessage({ type: 'error', text: 'Invalid price' })
      return
    }

    try {
      setSubmitting(true)
      const endpoint = orderType === 'LIMIT' 
        ? `${API_BASE_URL}/exchange/orders/limit`
        : `${API_BASE_URL}/exchange/orders/market`

      const body: any = {
            account_id: accountId,
            side: orderSide,
            catchment: selectedCatchment,
            unit_type: selectedUnitType,
        quantity_units: quantity,
      }
      
      if (orderType === 'LIMIT') {
        body.price_per_unit = price
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      if (res.ok) {
        const data = await res.json()
        const filledMsg = data.filled_quantity > 0 
          ? ` Filled: ${formatCredits(data.filled_quantity)}`
          : ''
        setMessage({ type: 'success', text: `Order placed!${filledMsg}` })
        setOrderQuantity('')
        setOrderPrice('')
        fetchOrderBook()
        fetchOpenOrders()
        fetchTrades()
        fetchBalance()
        fetchHoldings()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Order failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  // Cancel order
  const handleCancelOrder = async (orderId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/exchange/orders/${orderId}?account_id=${accountId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Order cancelled' })
        fetchOpenOrders()
        fetchOrderBook()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'Cancel failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    }
  }

  // Filter holdings by current market
  const marketHoldings = holdings.filter(
    h => h.catchment === selectedCatchment && h.unit_type === selectedUnitType
  )
  const totalMarketCredits = marketHoldings.reduce((sum, h) => {
    const available = role === 'landowner' 
      ? (h.trading_account_credits || 0) - (h.locked_credits || 0)
      : h.credits - (h.locked_credits || 0)
    return sum + Math.max(0, available)
  }, 0)

  // Best bid/ask
  const bestBid = orderBook.bids[0]?.price || 0
  const bestAsk = orderBook.asks[0]?.price || 0
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0
  const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0

  // Order preview
  const orderTotal = orderType === 'LIMIT' && orderQuantity && orderPrice
    ? (parseInt(orderQuantity) / 100000) * parseFloat(orderPrice)
    : orderType === 'MARKET' && orderQuantity && (orderSide === 'BUY' ? bestAsk : bestBid)
      ? (parseInt(orderQuantity) / 100000) * (orderSide === 'BUY' ? bestAsk : bestBid)
      : 0

    return (
    <AppShell
      title="Exchange"
      subtitle={`Trading ${selectedCatchment} ${selectedUnitType}`}
      maxWidth="2xl"
      actions={
        <div className="flex items-center gap-4">
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            options={[
              { value: 'developer', label: '🏗️ Developer' },
              { value: 'landowner', label: '🌾 Landowner' },
              { value: 'broker', label: '📊 Broker' },
            ]}
          />
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

      {/* Stats Row */}
      <StatsGrid columns={4} className="mb-6">
        <StatCard label="Cash Balance" value={balance} format="currency" variant="success" />
        <StatCard 
          label={`${selectedCatchment} ${selectedUnitType} Credits`} 
          value={totalMarketCredits} 
          format="credits" 
          variant="primary" 
        />
        <StatCard label="Best Bid" value={bestBid} format="currency" variant="info" />
        <StatCard label="Best Ask" value={bestAsk} format="currency" variant="warning" />
      </StatsGrid>

      {/* Market Selector */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[180px]">
            <Select
              label="Catchment"
              value={selectedCatchment}
              onChange={(e) => setSelectedCatchment(e.target.value)}
              options={CATCHMENTS.map(c => ({ value: c, label: c }))}
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Select
              label="Unit Type"
              value={selectedUnitType}
              onChange={(e) => setSelectedUnitType(e.target.value)}
              options={UNIT_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm text-[var(--color-text-muted)]">Spread</p>
            <p className="font-mono text-lg">
              {formatGBP(spread)} <span className="text-sm text-[var(--color-text-muted)]">({spreadPercent.toFixed(2)}%)</span>
            </p>
        </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Order Book & Holdings - Left Side */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Your Holdings by Catchment */}
          {holdings.length > 0 && (
            <Section title="Your Holdings" description="Credits available to sell by catchment">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(() => {
                  // Aggregate holdings by catchment + unit_type
                  const aggregated = holdings.reduce((acc, h) => {
                    const key = `${h.catchment}-${h.unit_type}`
                    const available = role === 'landowner'
                      ? (h.trading_account_credits || 0) - (h.locked_credits || 0)
                      : h.credits - (h.locked_credits || 0)
                    
                    if (!acc[key]) {
                      acc[key] = { catchment: h.catchment, unit_type: h.unit_type, credits: 0, schemes: 0 }
                    }
                    acc[key].credits += Math.max(0, available)
                    acc[key].schemes += 1
                    return acc
                  }, {} as Record<string, { catchment: string; unit_type: string; credits: number; schemes: number }>)
                  
                  return Object.values(aggregated)
                    .filter(a => a.credits > 0)
                    .sort((a, b) => b.credits - a.credits)
                    .map((agg) => {
                      const isSelected = agg.catchment === selectedCatchment && agg.unit_type === selectedUnitType
                      return (
                        <Card 
                          key={`${agg.catchment}-${agg.unit_type}`} 
                          variant={isSelected ? 'elevated' : 'glass'} 
                          padding="sm"
                          hover
                          className={cn(
                            'cursor-pointer transition-all',
                            isSelected && 'ring-2 ring-[var(--color-accent-primary)]'
                          )}
                          onClick={() => {
                            setSelectedCatchment(agg.catchment)
                            setSelectedUnitType(agg.unit_type)
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="info" size="sm">{agg.catchment}</Badge>
                            <span className="text-xs text-[var(--color-text-muted)] capitalize">{agg.unit_type}</span>
            </div>
                          <p className="font-mono text-lg text-[var(--color-accent-primary)] font-semibold">
                            {formatCredits(agg.credits)}
                          </p>
                          <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                            <span>{creditsToTonnes(agg.credits).toFixed(2)}t</span>
                            <span>{agg.schemes} scheme{agg.schemes !== 1 ? 's' : ''}</span>
              </div>
                        </Card>
                      )
                    })
                })()}
              </div>
            </Section>
          )}

          {/* Order Book */}
          <Card>
            <CardHeader 
              title="Order Book" 
              description={`${selectedCatchment} ${selectedUnitType} - Bids and Asks`}
            />
            
            <div className="grid grid-cols-2 gap-4">
              {/* Bids (Buy Orders) */}
              <div>
                <p className="text-sm font-medium text-[var(--color-status-success)] mb-2">Bids (Buy)</p>
                <div className="space-y-1">
                  {orderBook.bids.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No bids</p>
                  ) : (
                    orderBook.bids.slice(0, 10).map((entry, i) => (
                      <motion.div
                        key={`bid-${entry.price}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div 
                          className="h-6 bg-[var(--color-status-success)]/20 rounded-sm" 
                          style={{ width: `${Math.min(100, (entry.quantity / (orderBook.bids[0]?.quantity || 1)) * 100)}%` }}
                        />
                        <div className="flex-1 flex justify-between absolute left-0 right-0 px-2">
                          <span className="font-mono text-[var(--color-status-success)]">{formatGBP(entry.price)}</span>
                          <span className="font-mono text-[var(--color-text-secondary)]">{formatCredits(entry.quantity)}</span>
                      </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Asks (Sell Orders) */}
              <div>
                <p className="text-sm font-medium text-[var(--color-status-error)] mb-2">Asks (Sell)</p>
                <div className="space-y-1">
                  {orderBook.asks.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No asks</p>
                  ) : (
                    orderBook.asks.slice(0, 10).map((entry, i) => (
                      <motion.div
                        key={`ask-${entry.price}`}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center gap-2 text-sm relative"
                      >
                        <div 
                          className="h-6 bg-[var(--color-status-error)]/20 rounded-sm" 
                          style={{ width: `${Math.min(100, (entry.quantity / (orderBook.asks[0]?.quantity || 1)) * 100)}%` }}
                        />
                        <div className="flex-1 flex justify-between absolute left-0 right-0 px-2">
                          <span className="font-mono text-[var(--color-status-error)]">{formatGBP(entry.price)}</span>
                          <span className="font-mono text-[var(--color-text-secondary)]">{formatCredits(entry.quantity)}</span>
                      </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs for Orders & Trades */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="underline">
              <TabsTrigger value="open" variant="underline">Open Orders ({openOrders.length})</TabsTrigger>
              <TabsTrigger value="trades" variant="underline">Trade History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="open">
              <Card padding="none">
                <Table compact>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead align="right">Price</TableHead>
                      <TableHead align="right">Qty</TableHead>
                      <TableHead align="right">Filled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead align="center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                {openOrders.length === 0 ? (
                      <TableEmpty title="No open orders" description="Place an order to get started" />
                    ) : (
                      openOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Badge variant={order.order_type === 'LIMIT' ? 'info' : 'warning'} size="sm">
                              {order.order_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              'font-semibold',
                              order.side === 'BUY' ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-error)]'
                            )}>
                              {order.side}
                              </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="info" size="sm">{order.catchment}</Badge>
                            <span className="text-xs text-[var(--color-text-muted)] ml-1">{order.unit_type}</span>
                          </TableCell>
                          <TableCell align="right" mono>
                            {order.price_per_unit ? formatGBP(order.price_per_unit) : 'MARKET'}
                          </TableCell>
                          <TableCell align="right" mono>{formatCredits(order.quantity_units)}</TableCell>
                          <TableCell align="right" mono className="text-[var(--color-accent-primary)]">
                            {formatCredits(order.filled_quantity)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(order.status)} size="sm">{order.status}</Badge>
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              Cancel
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
            
            <TabsContent value="trades">
              <Card padding="none">
                <Table compact>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead align="right">Quantity</TableHead>
                      <TableHead align="right">Price</TableHead>
                      <TableHead align="right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.length === 0 ? (
                      <TableEmpty title="No trades yet" description="Your trade history will appear here" />
                    ) : (
                      trades.map((trade) => {
                        const isBuyer = trade.buyer_account_id === accountId
                      return (
                          <TableRow key={trade.id}>
                            <TableCell className="text-sm text-[var(--color-text-muted)]">
                              {new Date(trade.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                'font-semibold',
                                isBuyer ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-error)]'
                              )}>
                                {isBuyer ? 'BUY' : 'SELL'}
                              </span>
                            </TableCell>
                            <TableCell align="right" mono>{formatCredits(trade.quantity_units)}</TableCell>
                            <TableCell align="right" mono>{formatGBP(trade.price_per_unit)}</TableCell>
                            <TableCell align="right" mono className={cn(
                              'font-semibold',
                              isBuyer ? 'text-[var(--color-status-error)]' : 'text-[var(--color-status-success)]'
                            )}>
                              {isBuyer ? '-' : '+'}{formatGBP(trade.total_price)}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Order Form - Right Side */}
        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader title="Place Order" />
            
            {/* Side Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                variant={orderSide === 'BUY' ? 'primary' : 'ghost'}
                onClick={() => setOrderSide('BUY')}
                className={cn(
                  orderSide === 'BUY' && 'bg-[var(--color-status-success)] hover:bg-[var(--color-status-success)]/90'
                )}
              >
                Buy
              </Button>
              <Button
                variant={orderSide === 'SELL' ? 'primary' : 'ghost'}
                onClick={() => setOrderSide('SELL')}
                className={cn(
                  orderSide === 'SELL' && 'bg-[var(--color-status-error)] hover:bg-[var(--color-status-error)]/90'
                )}
              >
                Sell
              </Button>
            </div>

            {/* Order Type Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                size="sm"
                variant={orderType === 'LIMIT' ? 'secondary' : 'ghost'}
                onClick={() => setOrderType('LIMIT')}
              >
                Limit
              </Button>
              <Button
                size="sm"
                variant={orderType === 'MARKET' ? 'secondary' : 'ghost'}
                onClick={() => setOrderType('MARKET')}
              >
                Market
              </Button>
            </div>

            {/* Market Info */}
            <Card variant="glass" padding="sm" className="mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Market</span>
                <span>
                  <Badge variant="info" size="sm">{selectedCatchment}</Badge>
                  <span className="ml-1 capitalize">{selectedUnitType}</span>
                </span>
              </div>
              {orderSide === 'SELL' && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-[var(--color-text-muted)]">Your Available</span>
                  <span className="font-mono text-[var(--color-accent-primary)]">{formatCredits(totalMarketCredits)}</span>
                </div>
              )}
              {orderSide === 'BUY' && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-[var(--color-text-muted)]">Your Balance</span>
                  <span className="font-mono text-[var(--color-status-success)]">{formatGBP(balance)}</span>
                </div>
              )}
            </Card>
            
            {/* Price Input (Limit only) */}
            {orderType === 'LIMIT' && (
              <Input
                label="Price per Tonne (£)"
                  type="number"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                placeholder={orderSide === 'BUY' ? `Best ask: ${formatGBP(bestAsk)}` : `Best bid: ${formatGBP(bestBid)}`}
                />
            )}

            {/* Quantity Input */}
            <Input
              label="Quantity (Credits)"
                type="number"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
              placeholder="Enter credits"
              hint={orderSide === 'SELL' ? `Max: ${formatCredits(totalMarketCredits)}` : undefined}
            />
            
            {/* Quick Amount Buttons */}
            {orderSide === 'SELL' && totalMarketCredits > 0 && (
              <div className="flex gap-2 mt-2">
                {[25, 50, 75, 100].map(pct => (
                  <Button
                    key={pct}
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs"
                    onClick={() => setOrderQuantity(Math.floor(totalMarketCredits * pct / 100).toString())}
                  >
                    {pct}%
                  </Button>
                ))}
          </div>
            )}
            
            {/* Order Preview */}
            {orderQuantity && parseFloat(orderQuantity) > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-3 bg-[var(--color-background-elevated)] rounded-lg space-y-2 text-sm"
              >
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Tonnage</span>
                  <span className="font-mono">{creditsToTonnes(parseInt(orderQuantity)).toFixed(4)}</span>
                    </div>
                {orderType === 'LIMIT' && orderPrice && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Price</span>
                    <span className="font-mono">{formatGBP(parseFloat(orderPrice))}/t</span>
                          </div>
                        )}
                {orderType === 'MARKET' && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Est. Price</span>
                    <span className="font-mono">{formatGBP(orderSide === 'BUY' ? bestAsk : bestBid)}/t</span>
                </div>
              )}
                <div className="border-t border-[var(--color-border)] pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Est. Total</span>
                    <span className={cn(
                      'font-mono',
                      orderSide === 'BUY' ? 'text-[var(--color-status-error)]' : 'text-[var(--color-status-success)]'
                    )}>
                      {orderSide === 'BUY' ? '-' : '+'}{formatGBP(orderTotal)}
                            </span>
                          </div>
                        </div>
              </motion.div>
            )}
            
            {/* Submit Button */}
            <Button
              className={cn(
                'w-full mt-4',
                orderSide === 'BUY' 
                  ? 'bg-[var(--color-status-success)] hover:bg-[var(--color-status-success)]/90' 
                  : 'bg-[var(--color-status-error)] hover:bg-[var(--color-status-error)]/90'
              )}
              onClick={handlePlaceOrder}
              loading={submitting}
              disabled={!orderQuantity || (orderType === 'LIMIT' && !orderPrice)}
            >
              {orderSide === 'BUY' ? 'Place Buy Order' : 'Place Sell Order'}
            </Button>
            
            {/* Warnings */}
            {orderSide === 'SELL' && totalMarketCredits === 0 && (
              <p className="text-xs text-[var(--color-status-warning)] mt-2 text-center">
                You have no credits in this market to sell
              </p>
            )}
            {orderType === 'MARKET' && orderSide === 'BUY' && bestAsk === 0 && (
              <p className="text-xs text-[var(--color-status-warning)] mt-2 text-center">
                No sell orders available - try a limit order
              </p>
            )}
            {orderType === 'MARKET' && orderSide === 'SELL' && bestBid === 0 && (
              <p className="text-xs text-[var(--color-status-warning)] mt-2 text-center">
                No buy orders available - try a limit order
              </p>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export default Exchange
