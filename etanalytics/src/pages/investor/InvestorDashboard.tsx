import { useState, useEffect } from 'react'
import { useNavigate, Link, Routes, Route, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Eye,
  TrendingUp,
  BarChart3,
  Users,
  FileText,
  Download,
  LogOut,
  ChevronRight,
  Globe,
  Target,
  DollarSign,
  Briefcase,
  ArrowUpRight,
  PieChart,
  Building2,
  Calendar,
  Shield,
  Zap,
  Star
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell
} from 'recharts'

// Financial data
const arrProjections = [
  { year: 'Y1', conservative: 500, base: 960, aggressive: 1560 },
  { year: 'Y2', conservative: 1320, base: 2470, aggressive: 4060 },
  { year: 'Y3', conservative: 2400, base: 4480, aggressive: 7200 },
  { year: 'Y4', conservative: 3770, base: 6815, aggressive: 10880 },
  { year: 'Y5', conservative: 5600, base: 9610, aggressive: 15130 }
]

const customerGrowth = [
  { year: 'Y1', customers: 8, arpc: 120 },
  { year: 'Y2', customers: 19, arpc: 130 },
  { year: 'Y3', customers: 32, arpc: 140 },
  { year: 'Y4', customers: 47, arpc: 145 },
  { year: 'Y5', customers: 62, arpc: 155 }
]

const tierMix = [
  { name: 'Enterprise', value: 13, color: '#8B5CF6' },
  { name: 'Professional', value: 56, color: '#06B6D4' },
  { name: 'Starter', value: 31, color: '#10B981' }
]

const saasMetrics = [
  { metric: 'LTV:CAC', y1: '19x', y3: '27x', y5: '34x', benchmark: '>3x' },
  { metric: 'CAC Payback', y1: '2.5mo', y3: '1.8mo', y5: '1.4mo', benchmark: '<12mo' },
  { metric: 'Net Revenue Retention', y1: '100%', y3: '118%', y5: '118%', benchmark: '>110%' },
  { metric: 'Gross Margin', y1: '80%', y3: '80%', y5: '80%', benchmark: '>75%' },
  { metric: 'Rule of 40', y1: '-35', y3: '105', y5: '75', benchmark: '>40' }
]

const InvestorDashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('overview')

  // Check authentication
  useEffect(() => {
    const isAuth = localStorage.getItem('investorAuth')
    const authTime = localStorage.getItem('investorAuthTime')
    
    // Session expires after 24 hours
    if (!isAuth || !authTime || Date.now() - parseInt(authTime) > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('investorAuth')
      localStorage.removeItem('investorAuthTime')
      navigate('/')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('investorAuth')
    localStorage.removeItem('investorAuthTime')
    navigate('/')
  }

  const tabs = [
    { id: 'overview', label: 'Executive Summary', icon: FileText },
    { id: 'market', label: 'Market Research', icon: Globe },
    { id: 'financials', label: 'Financial Projections', icon: BarChart3 },
    { id: 'metrics', label: 'SaaS Metrics', icon: TrendingUp },
    { id: 'team', label: 'Join the Team', icon: Users }
  ]

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold">ET Analytics</span>
              </Link>
              <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 text-sm font-medium">
                Investor Pack
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <a
                href="/docs/investor-pack/ETAnalytics_Investor_Pack.pdf"
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-white/5 bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'market' && <MarketTab />}
        {activeTab === 'financials' && <FinancialsTab />}
        {activeTab === 'metrics' && <MetricsTab />}
        {activeTab === 'team' && <TeamTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>Confidential - For authorized investors and executive candidates only</p>
          <p className="mt-2">Last updated: January 2026 | Version 2.0</p>
        </div>
      </footer>
    </div>
  )
}

// Overview Tab Component
const OverviewTab = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-8"
  >
    {/* Hero Stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Market Opportunity', value: '€2.8T', sublabel: 'European ETF AUM' },
        { label: 'Target Market', value: '£18M', sublabel: 'Annual TAM' },
        { label: 'Year 5 ARR', value: '£9.6M', sublabel: 'Base case projection' },
        { label: 'Exit Multiple', value: '8x', sublabel: 'Revenue multiple' }
      ].map((stat, i) => (
        <div key={i} className="card-glass rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
          <p className="text-3xl font-bold gradient-text">{stat.value}</p>
          <p className="text-gray-500 text-xs mt-1">{stat.sublabel}</p>
        </div>
      ))}
    </div>

    {/* Investment Thesis */}
    <div className="card-glass rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <Target className="w-6 h-6 text-primary-400" />
        Investment Thesis
      </h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-primary-400">The Opportunity</h3>
          <ul className="space-y-3">
            {[
              'European ETF market: €2.8T AUM, growing 15.5% annually',
              '78% domiciled in Ireland - covered by statutory disclosure rights',
              '120+ issuers with zero visibility into beneficial ownership',
              'First-mover advantage in a new category'
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-300">
                <ChevronRight className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4 text-accent-400">Why ETAnalytics Wins</h3>
          <ul className="space-y-3">
            {[
              'Only platform operationalizing Irish disclosure rights',
              '5,000+ entity database with 95%+ matching accuracy',
              '90 days to full visibility vs. 6-12 months manual',
              '80% gross margins, 20x+ LTV:CAC ratio'
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-300">
                <ChevronRight className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>

    {/* Key Highlights */}
    <div className="grid md:grid-cols-3 gap-6">
      <div className="card-glass rounded-xl p-6">
        <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4">
          <DollarSign className="w-6 h-6 text-primary-400" />
        </div>
        <h3 className="font-semibold mb-2">The Ask</h3>
        <p className="text-2xl font-bold text-white mb-2">£2.5M Series A</p>
        <p className="text-gray-400 text-sm">17% dilution at £15M post-money</p>
      </div>
      
      <div className="card-glass rounded-xl p-6">
        <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center mb-4">
          <Calendar className="w-6 h-6 text-accent-400" />
        </div>
        <h3 className="font-semibold mb-2">Path to Profitability</h3>
        <p className="text-2xl font-bold text-white mb-2">Month 14</p>
        <p className="text-gray-400 text-sm">EBITDA positive by Q2 2027</p>
      </div>
      
      <div className="card-glass rounded-xl p-6">
        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
          <ArrowUpRight className="w-6 h-6 text-green-400" />
        </div>
        <h3 className="font-semibold mb-2">Exit Potential</h3>
        <p className="text-2xl font-bold text-white mb-2">£77M</p>
        <p className="text-gray-400 text-sm">Base case at 8x Year 5 ARR</p>
      </div>
    </div>
  </motion.div>
)

// Market Tab Component
const MarketTab = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-8"
  >
    <div className="card-glass rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <Globe className="w-6 h-6 text-primary-400" />
        European ETF Market Landscape
      </h2>
      
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Market Size & Growth</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-dark-800 rounded-lg">
              <span className="text-gray-400">Total AUM (2026)</span>
              <span className="text-xl font-bold">€2.8T</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-dark-800 rounded-lg">
              <span className="text-gray-400">CAGR (2020-2030)</span>
              <span className="text-xl font-bold text-green-400">15.5%</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-dark-800 rounded-lg">
              <span className="text-gray-400">Projected AUM (2030)</span>
              <span className="text-xl font-bold">€4.5T</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-dark-800 rounded-lg">
              <span className="text-gray-400">Number of ETFs</span>
              <span className="text-xl font-bold">3,400+</span>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4">Irish Domicile Dominance</h3>
          <div className="p-6 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-xl border border-primary-500/30">
            <div className="text-5xl font-bold gradient-text mb-2">78%</div>
            <p className="text-gray-300 mb-4">of European ETFs are Irish-domiciled</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Favorable US tax treaty (15% vs 30% withholding)</li>
              <li>• Companies Act 2014 disclosure rights</li>
              <li>• World-class regulatory framework</li>
              <li>• Deep fund administration expertise</li>
            </ul>
          </div>
        </div>
      </div>

      {/* TAM/SAM/SOM */}
      <h3 className="text-lg font-semibold mb-4">Market Opportunity</h3>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-6 bg-dark-800 rounded-xl border-l-4 border-primary-500">
          <p className="text-gray-400 text-sm mb-1">TAM</p>
          <p className="text-2xl font-bold">£27M</p>
          <p className="text-gray-500 text-xs mt-1">All European ETF issuers</p>
        </div>
        <div className="p-6 bg-dark-800 rounded-xl border-l-4 border-accent-500">
          <p className="text-gray-400 text-sm mb-1">SAM</p>
          <p className="text-2xl font-bold">£18M</p>
          <p className="text-gray-500 text-xs mt-1">Irish-domiciled UCITS</p>
        </div>
        <div className="p-6 bg-dark-800 rounded-xl border-l-4 border-green-500">
          <p className="text-gray-400 text-sm mb-1">SOM (Year 5)</p>
          <p className="text-2xl font-bold">£9.6M</p>
          <p className="text-gray-500 text-xs mt-1">52% market penetration</p>
        </div>
      </div>
    </div>

    {/* Competitive Landscape */}
    <div className="card-glass rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-6">Competitive Landscape</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Factor</th>
              <th className="text-left py-3 px-4 text-primary-400 font-medium">ETAnalytics</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Bloomberg/Refinitiv</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Broadridge</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5">
              <td className="py-3 px-4">Beneficial Ownership Data</td>
              <td className="py-3 px-4 text-green-400">✓ Yes - statutory disclosure</td>
              <td className="py-3 px-4 text-red-400">✗ Industry estimates only</td>
              <td className="py-3 px-4 text-red-400">✗ Nominee data only</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4">ETF-Specific Focus</td>
              <td className="py-3 px-4 text-green-400">✓ Purpose-built</td>
              <td className="py-3 px-4 text-yellow-400">~ Generic platform</td>
              <td className="py-3 px-4 text-yellow-400">~ IR focus</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4">Automated Disclosure</td>
              <td className="py-3 px-4 text-green-400">✓ Full workflow</td>
              <td className="py-3 px-4 text-red-400">✗ Not offered</td>
              <td className="py-3 px-4 text-red-400">✗ Manual process</td>
            </tr>
            <tr>
              <td className="py-3 px-4">Time to Value</td>
              <td className="py-3 px-4 text-green-400">90 days</td>
              <td className="py-3 px-4 text-gray-400">N/A</td>
              <td className="py-3 px-4 text-red-400">6-12 months</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </motion.div>
)

// Financials Tab Component
const FinancialsTab = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-8"
  >
    {/* ARR Projections Chart */}
    <div className="card-glass rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-primary-400" />
        5-Year ARR Projections (£'000)
      </h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={arrProjections}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="year" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
            />
            <Area
              type="monotone"
              dataKey="aggressive"
              stackId="1"
              stroke="#8B5CF6"
              fill="#8B5CF6"
              fillOpacity={0.3}
              name="Aggressive"
            />
            <Area
              type="monotone"
              dataKey="base"
              stackId="2"
              stroke="#06B6D4"
              fill="#06B6D4"
              fillOpacity={0.5}
              name="Base Case"
            />
            <Area
              type="monotone"
              dataKey="conservative"
              stackId="3"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.3}
              name="Conservative"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-8 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-gray-400">Conservative</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-sm text-gray-400">Base Case</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-sm text-gray-400">Aggressive</span>
        </div>
      </div>
    </div>

    {/* P&L Summary */}
    <div className="card-glass rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-6">P&L Summary - Base Case (£'000)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Line Item</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Y1</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Y2</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Y3</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Y4</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Y5</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5 bg-primary-500/5">
              <td className="py-3 px-4 font-medium">Revenue</td>
              <td className="py-3 px-4 text-right">960</td>
              <td className="py-3 px-4 text-right">2,470</td>
              <td className="py-3 px-4 text-right">4,480</td>
              <td className="py-3 px-4 text-right">6,815</td>
              <td className="py-3 px-4 text-right">9,610</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4">Gross Profit (80%)</td>
              <td className="py-3 px-4 text-right">768</td>
              <td className="py-3 px-4 text-right">1,976</td>
              <td className="py-3 px-4 text-right">3,584</td>
              <td className="py-3 px-4 text-right">5,452</td>
              <td className="py-3 px-4 text-right">7,688</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4">Total OpEx</td>
              <td className="py-3 px-4 text-right">(1,100)</td>
              <td className="py-3 px-4 text-right">(1,750)</td>
              <td className="py-3 px-4 text-right">(2,500)</td>
              <td className="py-3 px-4 text-right">(3,460)</td>
              <td className="py-3 px-4 text-right">(4,430)</td>
            </tr>
            <tr className="border-b border-white/5 bg-accent-500/5">
              <td className="py-3 px-4 font-medium">EBITDA</td>
              <td className="py-3 px-4 text-right text-red-400">(332)</td>
              <td className="py-3 px-4 text-right text-green-400">226</td>
              <td className="py-3 px-4 text-right text-green-400">1,084</td>
              <td className="py-3 px-4 text-right text-green-400">1,992</td>
              <td className="py-3 px-4 text-right text-green-400">3,258</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 px-4 text-gray-500">EBITDA Margin</td>
              <td className="py-3 px-4 text-right text-red-400">-35%</td>
              <td className="py-3 px-4 text-right">9%</td>
              <td className="py-3 px-4 text-right">24%</td>
              <td className="py-3 px-4 text-right">29%</td>
              <td className="py-3 px-4 text-right">34%</td>
            </tr>
            <tr className="bg-green-500/5">
              <td className="py-3 px-4 font-medium">Net Income</td>
              <td className="py-3 px-4 text-right text-red-400">(372)</td>
              <td className="py-3 px-4 text-right text-green-400">124</td>
              <td className="py-3 px-4 text-right text-green-400">746</td>
              <td className="py-3 px-4 text-right text-green-400">1,412</td>
              <td className="py-3 px-4 text-right text-green-400">2,346</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* Customer & Revenue Mix */}
    <div className="grid md:grid-cols-2 gap-8">
      <div className="card-glass rounded-2xl p-8">
        <h3 className="text-lg font-semibold mb-6">Customer Growth</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={customerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="customers" fill="#06B6D4" name="Customers" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-glass rounded-2xl p-8">
        <h3 className="text-lg font-semibold mb-6">Revenue by Tier (Year 5)</h3>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={tierMix}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {tierMix.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    {/* Exit Scenarios */}
    <div className="card-glass rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-6">Exit Scenarios (Year 5)</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { scenario: 'Conservative', arr: '£5.6M', multiple: '6x', value: '£34M', return: '2.2x' },
          { scenario: 'Base Case', arr: '£9.6M', multiple: '8x', value: '£77M', return: '5.1x', highlight: true },
          { scenario: 'Aggressive', arr: '£15.1M', multiple: '10x', value: '£151M', return: '10.1x' }
        ].map((exit, i) => (
          <div
            key={i}
            className={`p-6 rounded-xl ${
              exit.highlight
                ? 'bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/30'
                : 'bg-dark-800'
            }`}
          >
            <p className="text-gray-400 text-sm mb-2">{exit.scenario}</p>
            <p className="text-3xl font-bold mb-4">{exit.value}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">ARR</span>
                <span>{exit.arr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Multiple</span>
                <span>{exit.multiple}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Series A Return</span>
                <span className="text-green-400 font-medium">{exit.return}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
)

// Metrics Tab Component
const MetricsTab = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-8"
  >
    <div className="card-glass rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-primary-400" />
        SaaS Metrics Dashboard
      </h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Metric</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Year 1</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Year 3</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Year 5</th>
              <th className="text-right py-3 px-4 text-accent-400 font-medium">Benchmark</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {saasMetrics.map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-3 px-4 font-medium">{row.metric}</td>
                <td className="py-3 px-4 text-right">{row.y1}</td>
                <td className="py-3 px-4 text-right">{row.y3}</td>
                <td className="py-3 px-4 text-right font-medium text-white">{row.y5}</td>
                <td className="py-3 px-4 text-right text-accent-400">{row.benchmark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Unit Economics */}
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { label: 'LTV:CAC Ratio', value: '34x', benchmark: '>3x', status: 'excellent' },
        { label: 'CAC Payback', value: '1.4 mo', benchmark: '<12 mo', status: 'excellent' },
        { label: 'Net Revenue Retention', value: '118%', benchmark: '>110%', status: 'good' },
        { label: 'Rule of 40', value: '75', benchmark: '>40', status: 'excellent' }
      ].map((metric, i) => (
        <div key={i} className="card-glass rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-2">{metric.label}</p>
          <p className="text-3xl font-bold gradient-text mb-2">{metric.value}</p>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs ${
              metric.status === 'excellent' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {metric.status === 'excellent' ? 'Excellent' : 'Good'}
            </span>
            <span className="text-gray-500 text-xs">Target: {metric.benchmark}</span>
          </div>
        </div>
      ))}
    </div>

    {/* Why These Metrics Matter */}
    <div className="card-glass rounded-2xl p-8">
      <h3 className="text-lg font-semibold mb-6">Why These Metrics Matter</h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 bg-dark-800 rounded-xl">
          <h4 className="font-medium text-primary-400 mb-2">Exceptional Unit Economics</h4>
          <p className="text-gray-400 text-sm">
            34x LTV:CAC ratio indicates highly efficient customer acquisition. 
            Each £1 spent on sales & marketing generates £34 in customer lifetime value.
          </p>
        </div>
        <div className="p-4 bg-dark-800 rounded-xl">
          <h4 className="font-medium text-accent-400 mb-2">Strong Retention</h4>
          <p className="text-gray-400 text-sm">
            118% NRR means existing customers grow their spend by 18% annually through 
            upsells and tier upgrades - a sign of strong product-market fit.
          </p>
        </div>
        <div className="p-4 bg-dark-800 rounded-xl">
          <h4 className="font-medium text-green-400 mb-2">Rapid Payback</h4>
          <p className="text-gray-400 text-sm">
            1.4 month CAC payback (vs. 12 month benchmark) means we recover customer 
            acquisition costs almost immediately - enabling aggressive growth.
          </p>
        </div>
        <div className="p-4 bg-dark-800 rounded-xl">
          <h4 className="font-medium text-purple-400 mb-2">Rule of 40 Excellence</h4>
          <p className="text-gray-400 text-sm">
            Score of 75 (growth rate + EBITDA margin) far exceeds the 40 benchmark, 
            indicating a healthy balance of growth and profitability.
          </p>
        </div>
      </div>
    </div>
  </motion.div>
)

// Team Tab Component
const TeamTab = () => {
  // MD Compensation Package
  const mdPackage = {
    baseEquity: 5.0,
    milestone1Equity: 2.5,  // At £2m revenue
    milestone2Equity: 2.5,  // At £5m revenue
    maxEquity: 10.0,
    commissionRate: 17.5,
    monthlyStipend: 1000,
    exitValuations: {
      conservative: 34000000,  // £34M
      base: 77000000,          // £77M
      aggressive: 150000000    // £150M
    }
  }

  // Year-by-year earnings projections for MD
  const mdProjections = [
    { year: 'Year 1', revenue: 500000, commission: 87500, stipend: 6000, equity: '5%', totalEarnings: 93500, note: 'Stipend starts after 1st sale (~6 months)' },
    { year: 'Year 2', revenue: 1200000, commission: 210000, stipend: 12000, equity: '5%', totalEarnings: 222000, note: 'Building pipeline' },
    { year: 'Year 3', revenue: 2500000, commission: 437500, stipend: 12000, equity: '7.5%', totalEarnings: 449500, note: '+2.5% equity at £2m milestone' },
    { year: 'Year 4', revenue: 5500000, commission: 962500, stipend: 12000, equity: '10%', totalEarnings: 974500, note: '+2.5% equity at £5m milestone' }
  ]

  const formatCurrency = (n: number) => n >= 1000000 ? `£${(n/1000000).toFixed(1)}M` : `£${n.toLocaleString()}`

  return (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-8"
  >
    {/* MD Opportunity - Featured Section */}
    <div className="card-glass rounded-2xl p-8 border-2 border-accent-500/30 bg-gradient-to-br from-accent-500/10 to-primary-500/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
          <Star className="w-6 h-6 text-accent-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Managing Director Opportunity</h2>
          <p className="text-gray-400">Lead commercial growth for Europe's emerging ETF intelligence platform</p>
        </div>
      </div>

      {/* The Package */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-accent-400 mb-1">5%</div>
          <div className="text-sm text-gray-400">Starting Equity</div>
          <div className="text-xs text-gray-500 mt-1">Up to 10% on milestones</div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400 mb-1">17.5%</div>
          <div className="text-sm text-gray-400">Commission</div>
          <div className="text-xs text-gray-500 mt-1">On revenue you bring in</div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-primary-400 mb-1">£1,000</div>
          <div className="text-sm text-gray-400">Monthly Stipend</div>
          <div className="text-xs text-gray-500 mt-1">Starts after 1st sale</div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-400 mb-1">4yr</div>
          <div className="text-sm text-gray-400">Vesting Schedule</div>
          <div className="text-xs text-gray-500 mt-1">1yr cliff, monthly after</div>
        </div>
      </div>

      {/* Equity Milestones */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary-400" />
          Equity Milestones
        </h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 bg-dark-800/50 rounded-lg px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 font-bold">5%</div>
            <div>
              <div className="font-medium">Day 1</div>
              <div className="text-xs text-gray-500">Base equity grant</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-600" />
          <div className="flex items-center gap-3 bg-dark-800/50 rounded-lg px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">7.5%</div>
            <div>
              <div className="font-medium">£2M Revenue</div>
              <div className="text-xs text-gray-500">+2.5% equity bonus</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-600" />
          <div className="flex items-center gap-3 bg-dark-800/50 rounded-lg px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">10%</div>
            <div>
              <div className="font-medium">£5M Revenue</div>
              <div className="text-xs text-gray-500">+2.5% equity bonus</div>
            </div>
          </div>
        </div>
      </div>

      {/* Year-by-Year Projections */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Projected Earnings (Year by Year)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Period</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Revenue Generated</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Commission (17.5%)</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Stipend</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Equity Stake</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Total Cash</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {mdProjections.map((row, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 px-4 font-medium">{row.year}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(row.revenue)}</td>
                  <td className="py-3 px-4 text-right text-green-400">{formatCurrency(row.commission)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(row.stipend)}</td>
                  <td className="py-3 px-4 text-right text-primary-400">{row.equity}</td>
                  <td className="py-3 px-4 text-right font-bold text-accent-400">{formatCurrency(row.totalEarnings)}</td>
                </tr>
              ))}
              <tr className="bg-dark-700/50">
                <td colSpan={5} className="py-3 px-4 font-semibold">4-Year Total Cash Earnings</td>
                <td className="py-3 px-4 text-right font-bold text-2xl text-accent-400">
                  {formatCurrency(mdProjections.reduce((sum, p) => sum + p.totalEarnings, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-500 text-xs mt-2">* Projections assume successful pipeline development and market execution</p>
      </div>

      {/* Exit Scenarios */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-accent-400" />
          Exit Scenarios (10% Equity)
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-dark-800/50 rounded-xl p-4 text-center border border-gray-700/50">
            <div className="text-sm text-gray-500 mb-1">Conservative (£34M exit)</div>
            <div className="text-2xl font-bold text-gray-300">£3.4M</div>
            <div className="text-xs text-gray-500 mt-1">Your share at exit</div>
          </div>
          <div className="bg-dark-800/50 rounded-xl p-4 text-center border-2 border-green-500/30">
            <div className="text-sm text-green-400 mb-1">Base Case (£77M exit)</div>
            <div className="text-2xl font-bold text-green-400">£7.7M</div>
            <div className="text-xs text-gray-500 mt-1">Your share at exit</div>
          </div>
          <div className="bg-dark-800/50 rounded-xl p-4 text-center border border-purple-500/30">
            <div className="text-sm text-purple-400 mb-1">Aggressive (£150M exit)</div>
            <div className="text-2xl font-bold text-purple-400">£15M</div>
            <div className="text-xs text-gray-500 mt-1">Your share at exit</div>
          </div>
        </div>
        <p className="text-gray-500 text-xs mt-3">* Assumes full 10% equity vested, post-dilution from Series A & B rounds (~30% dilution total)</p>
      </div>
    </div>
  </motion.div>
  )
}

export default InvestorDashboard

