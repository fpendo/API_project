import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AppShell, Section } from '../components/layout'
import { Button, Card, CardHeader, Badge, getStatusVariant, Modal, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui'
import { StatCard, StatsGrid, NotificationBanner } from '../components/domain'
import { formatGBP, formatCredits, formatTonnage } from '../lib/utils'

const API_BASE_URL = 'http://localhost:8000'

// Types
interface Account {
  account_id: number
  name: string
  role: string
  eth_address: string
  balance_gbp: number
}

interface GlobalHolding {
  account_id: number
  account_name: string
  role: string
  scheme_id: number
  scheme_name: string
  catchment: string
  unit_type: string
  credits: number
  tonnes: number
}

interface Listing {
  listing_id: number
  seller_account_id: number
  seller_name: string
  scheme_name: string
  credits: number
  price_per_tonne: number
  status: string
}

function Operator() {
  const [activeTab, setActiveTab] = useState('overview')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [holdings, setHoldings] = useState<GlobalHolding[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // OTC Modal
  const [showOTCModal, setShowOTCModal] = useState(false)
  const [otcSeller, setOtcSeller] = useState('')
  const [otcBuyer, setOtcBuyer] = useState('')
  const [otcScheme, setOtcScheme] = useState('')
  const [otcAmount, setOtcAmount] = useState('')
  const [otcPrice, setOtcPrice] = useState('')
  const [processing, setProcessing] = useState(false)

  // Fetch data
  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts`)
      if (res.ok) setAccounts(await res.json())
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
    }
  }

  const fetchHoldings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/operator/global-holdings`)
      if (res.ok) {
        const data = await res.json()
        setHoldings(data.holdings || [])
      }
    } catch (err) {
      console.error('Failed to fetch holdings:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchListings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/exchange/listings?status=OPEN`)
      if (res.ok) setListings(await res.json())
    } catch (err) {
      console.error('Failed to fetch listings:', err)
    }
  }

  useEffect(() => {
    fetchAccounts()
    fetchHoldings()
    fetchListings()
    
    const interval = setInterval(() => {
      fetchAccounts()
      fetchHoldings()
      fetchListings()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Execute OTC deal
  const handleOTCDeal = async () => {
    if (!otcSeller || !otcBuyer || !otcScheme || !otcAmount || !otcPrice) {
      setMessage({ type: 'error', text: 'Please fill all fields' })
      return
    }
    
    try {
      setProcessing(true)
      const res = await fetch(`${API_BASE_URL}/operator/otc-deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_account_id: parseInt(otcSeller),
          buyer_account_id: parseInt(otcBuyer),
          scheme_id: parseInt(otcScheme),
          credits: parseInt(otcAmount),
          price_per_tonne: parseFloat(otcPrice),
        }),
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'OTC deal executed successfully!' })
        setShowOTCModal(false)
        setOtcSeller('')
        setOtcBuyer('')
        setOtcScheme('')
        setOtcAmount('')
        setOtcPrice('')
        fetchAccounts()
        fetchHoldings()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.detail || 'OTC deal failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  // Computed values
  const totalAccounts = accounts.length
  const totalCredits = holdings.reduce((sum, h) => sum + h.credits, 0)
  const totalValue = listings.reduce((sum, l) => sum + (l.credits / 100000) * l.price_per_tonne, 0)
  const roleGroups = accounts.reduce((acc, a) => {
    acc[a.role] = (acc[a.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Get unique schemes for OTC form
  const uniqueSchemes = Array.from(
    new Map(holdings.map(h => [h.scheme_id, { id: h.scheme_id, name: h.scheme_name }])).values()
  )

  return (
    <AppShell
      title="Exchange Operator"
      subtitle="Platform administration and OTC desk"
      actions={
        <Button onClick={() => setShowOTCModal(true)}>Execute OTC Deal</Button>
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
        <StatCard label="Total Accounts" value={totalAccounts} />
        <StatCard label="Credits in System" value={totalCredits} format="credits" variant="primary" />
        <StatCard label="Active Listings" value={listings.length} variant="warning" />
        <StatCard label="Listed Value" value={totalValue} format="currency" variant="success" />
      </StatsGrid>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="underline">
          <TabsTrigger value="overview" variant="underline">Overview</TabsTrigger>
          <TabsTrigger value="accounts" variant="underline">Accounts ({totalAccounts})</TabsTrigger>
          <TabsTrigger value="holdings" variant="underline">Global Holdings</TabsTrigger>
          <TabsTrigger value="listings" variant="underline">Active Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role breakdown */}
            <Card>
              <CardHeader title="Accounts by Role" />
              <div className="space-y-3">
                {Object.entries(roleGroups).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="capitalize text-text-secondary">{role}</span>
                    </div>
                    <Badge variant="default">{count}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader title="Quick Actions" />
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => setShowOTCModal(true)}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Execute OTC Deal
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => setActiveTab('accounts')}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Manage Accounts
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => setActiveTab('holdings')}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Global Holdings
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts">
          <Section title="All Accounts">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead align="right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.account_id}>
                      <TableCell mono>{account.account_id}</TableCell>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="capitalize">{account.role}</Badge>
                      </TableCell>
                      <TableCell mono className="text-text-muted text-sm">
                        {account.eth_address.slice(0, 10)}...{account.eth_address.slice(-8)}
                      </TableCell>
                      <TableCell align="right" mono className="text-accent-primary">
                        {formatGBP(account.balance_gbp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </Section>
        </TabsContent>

        <TabsContent value="holdings">
          <Section title="Global Credit Holdings" description="All credit holdings across all accounts">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Catchment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead align="right">Credits</TableHead>
                    <TableHead align="right">Tonnes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-text-muted">
                        Loading holdings...
                      </TableCell>
                    </TableRow>
                  ) : holdings.length === 0 ? (
                    <TableEmpty title="No holdings in system" />
                  ) : (
                    holdings.map((h, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{h.account_name}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="capitalize">{h.role}</Badge>
                        </TableCell>
                        <TableCell>{h.scheme_name}</TableCell>
                        <TableCell><Badge variant="info">{h.catchment}</Badge></TableCell>
                        <TableCell className="capitalize">{h.unit_type}</TableCell>
                        <TableCell align="right" mono className="text-accent-primary">
                          {formatCredits(h.credits)}
                        </TableCell>
                        <TableCell align="right" mono>
                          {formatTonnage(h.tonnes)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </Section>
        </TabsContent>

        <TabsContent value="listings">
          <Section title="Active Listings" description="All active listings on the exchange">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead align="right">Credits</TableHead>
                    <TableHead align="right">Price/Tonne</TableHead>
                    <TableHead align="right">Total Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.length === 0 ? (
                    <TableEmpty title="No active listings" />
                  ) : (
                    listings.map((listing) => {
                      const totalValue = (listing.credits / 100000) * listing.price_per_tonne
                      return (
                        <TableRow key={listing.listing_id}>
                          <TableCell className="font-medium">{listing.seller_name}</TableCell>
                          <TableCell>{listing.scheme_name}</TableCell>
                          <TableCell align="right" mono>{formatCredits(listing.credits)}</TableCell>
                          <TableCell align="right" mono className="text-accent-primary">
                            {formatGBP(listing.price_per_tonne)}
                          </TableCell>
                          <TableCell align="right" mono>{formatGBP(totalValue)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(listing.status)} dot>
                              {listing.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </Section>
        </TabsContent>
      </Tabs>

      {/* OTC Modal */}
      <Modal
        isOpen={showOTCModal}
        onClose={() => {
          setShowOTCModal(false)
          setOtcSeller('')
          setOtcBuyer('')
          setOtcScheme('')
          setOtcAmount('')
          setOtcPrice('')
        }}
        title="Execute OTC Deal"
        description="Transfer credits directly between accounts"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowOTCModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleOTCDeal}
              loading={processing}
              disabled={!otcSeller || !otcBuyer || !otcScheme || !otcAmount || !otcPrice}
            >
              Execute Deal
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Seller Account"
            value={otcSeller}
            onChange={(e) => setOtcSeller(e.target.value)}
            options={accounts.map(a => ({
              value: a.account_id.toString(),
              label: `${a.name} (${a.role})`,
            }))}
            placeholder="Select seller"
          />
          
          <Select
            label="Buyer Account"
            value={otcBuyer}
            onChange={(e) => setOtcBuyer(e.target.value)}
            options={accounts.filter(a => a.account_id.toString() !== otcSeller).map(a => ({
              value: a.account_id.toString(),
              label: `${a.name} (${a.role})`,
            }))}
            placeholder="Select buyer"
          />
          
          <Select
            label="Scheme"
            value={otcScheme}
            onChange={(e) => setOtcScheme(e.target.value)}
            options={uniqueSchemes.map(s => ({
              value: s.id.toString(),
              label: s.name,
            }))}
            placeholder="Select scheme"
          />
          
          <Input
            label="Credits to Transfer"
            type="number"
            value={otcAmount}
            onChange={(e) => setOtcAmount(e.target.value)}
            placeholder="Enter amount"
          />
          
          <Input
            label="Price per Tonne (GBP)"
            type="number"
            value={otcPrice}
            onChange={(e) => setOtcPrice(e.target.value)}
            placeholder="e.g., 25000"
          />
          
          {otcAmount && otcPrice && !isNaN(parseFloat(otcAmount)) && !isNaN(parseFloat(otcPrice)) && (
            <Card variant="elevated" padding="sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Total Value</span>
                <span className="font-mono font-semibold text-accent-primary">
                  {formatGBP((parseFloat(otcAmount) / 100000) * parseFloat(otcPrice))}
                </span>
              </div>
            </Card>
          )}
        </div>
      </Modal>
    </AppShell>
  )
}

export default Operator
