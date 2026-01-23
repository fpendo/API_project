import React, { useState, useRef, useCallback, useMemo, createContext, useContext } from 'react'
import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  Upload,
  FileText,
  BarChart3,
  Settings,
  Bell,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Download,
  Filter,
  Search,
  Plus,
  X,
  Building2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  FileUp,
  Link as LinkIcon,
  Mail,
  Target,
  PieChartIcon,
  Users,
  FileSpreadsheet,
  ArrowLeft
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts'
import { sampleETFs, sampleDailyChanges, getEntityTypeColor, getEntityTypeLabel } from '../store/data'
import { useRegisters, parseCSVToRegister } from '../store/RegisterContext'
import { useActivities, groupActivitiesByDate, formatRelativeTime, Activity } from '../store/ActivityContext'
import { useETFDatabase, DeliveredReport as ETFReport, ETFProduct, ShareClass, NAVRecord } from '../store/ETFDatabaseContext'
import { MobileNav } from '../components/MobileNav'
import DemoDisclaimerModal from '../components/DemoDisclaimerModal'
import { collectTerminalDMs, DECISION_MAKER_TYPES, WorkflowState } from '../store/historicalData'

// Issuer configuration data
interface IssuerConfig {
  id: string
  name: string
  logo: string
  etfCount: number
  totalAum: number
  primaryColor: string
}

const issuerConfigs: Record<string, IssuerConfig> = {
  'amundi': {
    id: 'amundi',
    name: 'Amundi',
    logo: 'A',
    etfCount: 42,
    totalAum: 98500000000,
    primaryColor: '#6366f1'
  },
  'blackrock': {
    id: 'blackrock',
    name: 'BlackRock',
    logo: 'B',
    etfCount: 156,
    totalAum: 892000000000,
    primaryColor: '#000000'
  },
  'vanguard': {
    id: 'vanguard',
    name: 'Vanguard',
    logo: 'V',
    etfCount: 82,
    totalAum: 456000000000,
    primaryColor: '#c41230'
  },
  'invesco': {
    id: 'invesco',
    name: 'Invesco',
    logo: 'I',
    etfCount: 67,
    totalAum: 82000000000,
    primaryColor: '#003b5c'
  },
  'dws': {
    id: 'dws',
    name: 'DWS (Xtrackers)',
    logo: 'D',
    etfCount: 89,
    totalAum: 124000000000,
    primaryColor: '#001e50'
  }
}

// Issuer Context
interface IssuerContextType {
  currentIssuer: IssuerConfig
  setCurrentIssuer: (issuerId: string) => void
}

const IssuerContext = createContext<IssuerContextType | null>(null)

const useIssuer = () => {
  const context = useContext(IssuerContext)
  if (!context) throw new Error('useIssuer must be used within IssuerProvider')
  return context
}

// Report type definition
interface DeliveredReport {
  id: string
  registerId: string
  issuerName: string
  deliveredAt: string
  identifiedPct: number
  totalHolders: number
  matchedHolders: number
  etfProducts: {
    isin: string
    name: string
    totalShares: number
    identifiedPct: number
    topHolders: { name: string; shares: number; pct: number; type: string }[]
  }[]
  ownershipBreakdown: { type: string; pct: number; color: string }[]
}

// Sample delivered report (will be populated when analyst delivers)
const sampleDeliveredReport: DeliveredReport = {
  id: 'report-001',
  registerId: 'reg-001',
  issuerName: 'Amundi',
  deliveredAt: '2026-01-13T14:30:00Z',
  identifiedPct: 45.2,
  totalHolders: 10,
  matchedHolders: 7,
  etfProducts: [
    {
      isin: 'IE00B4L5Y983',
      name: 'MSCI World UCITS ETF',
      totalShares: 126952000,
      identifiedPct: 52.3,
      topHolders: [
        { name: 'Brewin Dolphin Wealth Management', shares: 28500000, pct: 22.4, type: 'Wealth Manager' },
        { name: 'Coutts & Co', shares: 18200000, pct: 14.3, type: 'Private Bank' },
        { name: 'Hargreaves Lansdown', shares: 15800000, pct: 12.4, type: 'Execution Platform' },
        { name: 'St. James\'s Place', shares: 12400000, pct: 9.8, type: 'Wealth Manager' },
        { name: 'Quilter', shares: 9800000, pct: 7.7, type: 'Wealth Manager' },
        { name: 'AJ Bell', shares: 8200000, pct: 6.5, type: 'Execution Platform' },
        { name: 'Interactive Investor', shares: 6200000, pct: 4.9, type: 'Execution Platform' },
        { name: 'Saltus Investment Management', shares: 5100000, pct: 4.0, type: 'Investment Manager' },
        { name: 'Canaccord Genuity Wealth', shares: 4200000, pct: 3.3, type: 'Investment Manager' },
        { name: 'Brooks Macdonald', shares: 3800000, pct: 3.0, type: 'Investment Manager' },
      ]
    },
    {
      isin: 'IE00B5BMR087',
      name: 'S&P 500 UCITS ETF',
      totalShares: 82458000,
      identifiedPct: 48.1,
      topHolders: [
        { name: 'Interactive Investor', shares: 18500000, pct: 22.4, type: 'Execution Platform' },
        { name: 'Rathbones', shares: 14200000, pct: 17.2, type: 'Wealth Manager' },
        { name: 'Charles Stanley', shares: 11800000, pct: 14.3, type: 'Wealth Manager' },
        { name: 'Evelyn Partners', shares: 8900000, pct: 10.8, type: 'Wealth Manager' },
      ]
    },
    {
      isin: 'IE00BK5BQT80',
      name: 'FTSE All-World UCITS ETF',
      totalShares: 104520000,
      identifiedPct: 38.5,
      topHolders: [
        { name: 'Vanguard Personal Investor', shares: 22400000, pct: 21.4, type: 'Execution Platform' },
        { name: 'Schroders Wealth', shares: 16800000, pct: 16.1, type: 'Wealth Manager' },
        { name: 'Brooks Macdonald', shares: 12500000, pct: 12.0, type: 'Investment Manager' },
      ]
    },
    {
      isin: 'IE00B4L5YC18',
      name: 'Euro Stoxx 50 UCITS ETF',
      totalShares: 57312000,
      identifiedPct: 42.8,
      topHolders: [
        { name: 'Deutsche Bank Wealth', shares: 15200000, pct: 26.5, type: 'Private Bank' },
        { name: 'UBS Wealth Management', shares: 12800000, pct: 22.3, type: 'Private Bank' },
        { name: 'BNP Paribas Wealth', shares: 8500000, pct: 14.8, type: 'Private Bank' },
      ]
    },
    {
      isin: 'IE00B3RBWM25',
      name: 'Emerging Markets UCITS ETF',
      totalShares: 68237000,
      identifiedPct: 44.2,
      topHolders: [
        { name: 'HSBC Private Bank', shares: 18900000, pct: 27.7, type: 'Private Bank' },
        { name: 'Barclays Wealth', shares: 14200000, pct: 20.8, type: 'Private Bank' },
      ]
    },
  ],
  ownershipBreakdown: [
    { type: 'Wealth Managers', pct: 28.5, color: '#6366f1' },
    { type: 'Private Banks', pct: 18.2, color: '#8b5cf6' },
    { type: 'Execution Platforms', pct: 15.8, color: '#06b6d4' },
    { type: 'Investment Managers', pct: 8.4, color: '#10b981' },
    { type: 'Unidentified', pct: 29.1, color: '#475569' },
  ]
}

// Reports Context
interface ReportsContextType {
  deliveredReports: DeliveredReport[]
  addReport: (report: DeliveredReport) => void
}

const ReportsContext = createContext<ReportsContextType | null>(null)

const useReports = () => {
  const context = useContext(ReportsContext)
  if (!context) throw new Error('useReports must be used within ReportsProvider')
  return context
}

const IssuerDashboard = () => {
  const location = useLocation()
  const [notifications, setNotifications] = useState(3)
  const [showIssuerSwitcher, setShowIssuerSwitcher] = useState(false)
  
  // Current issuer state - persisted in localStorage
  const [currentIssuerId, setCurrentIssuerId] = useState<string>(() => {
    const saved = localStorage.getItem('etanalytics_current_issuer')
    return saved || 'amundi'
  })
  
  const currentIssuer = issuerConfigs[currentIssuerId] || issuerConfigs['amundi']
  
  const setCurrentIssuer = (issuerId: string) => {
    setCurrentIssuerId(issuerId)
    localStorage.setItem('etanalytics_current_issuer', issuerId)
    setShowIssuerSwitcher(false)
  }
  
  const issuerContextValue: IssuerContextType = {
    currentIssuer,
    setCurrentIssuer
  }
  
  // Delivered reports state - includes sample report
  const [deliveredReports, setDeliveredReports] = useState<DeliveredReport[]>([sampleDeliveredReport])
  
  const addReport = (report: DeliveredReport) => {
    setDeliveredReports(prev => [report, ...prev])
  }
  
  const reportsContextValue: ReportsContextType = {
    deliveredReports,
    addReport
  }

  const navItems = [
    { path: '/issuer', icon: BarChart3, label: 'Overview', exact: true },
    { path: '/issuer/registers', icon: FileSpreadsheet, label: 'Registers' },
    { path: '/issuer/analytics', icon: TrendingUp, label: 'Analytics' },
    { path: '/issuer/upload', icon: Upload, label: 'Upload Register' },
    { path: '/issuer/reports', icon: FileText, label: 'Reports' },
    { path: '/issuer/settings', icon: Settings, label: 'Settings' },
  ]

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <IssuerContext.Provider value={issuerContextValue}>
    <>
      {/* Demo Disclaimer Modal */}
      <DemoDisclaimerModal />
      
      <div className="min-h-screen bg-dark-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-900 border-r border-white/5 flex flex-col">
        {/* Issuer Selector */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <button
              onClick={() => setShowIssuerSwitcher(!showIssuerSwitcher)}
              className="w-full flex items-center gap-3 p-3 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: currentIssuer.primaryColor }}
              >
                {currentIssuer.logo}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">{currentIssuer.name}</div>
                <div className="text-xs text-gray-500">{currentIssuer.etfCount} ETF Products</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showIssuerSwitcher ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Issuer Dropdown */}
            <AnimatePresence>
              {showIssuerSwitcher && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-2">
                    <div className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2">Switch Issuer Account</div>
                    {Object.values(issuerConfigs).map(issuer => (
                      <button
                        key={issuer.id}
                        onClick={() => setCurrentIssuer(issuer.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          issuer.id === currentIssuerId 
                            ? 'bg-primary-500/20 border border-primary-500/30' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: issuer.primaryColor }}
                        >
                          {issuer.logo}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-white">{issuer.name}</div>
                          <div className="text-xs text-gray-500">{issuer.etfCount} ETFs • €{(issuer.totalAum / 1e9).toFixed(0)}B AUM</div>
                        </div>
                        {issuer.id === currentIssuerId && (
                          <CheckCircle className="w-4 h-4 text-primary-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 p-6 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">ET Analytics</span>
        </Link>

        {/* Issuer Badge - Dynamic */}
        <div className="p-4 mx-4 mt-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: currentIssuer.primaryColor }}
            >
              {currentIssuer.logo}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{currentIssuer.name}</div>
              <div className="text-xs text-gray-500">{currentIssuer.etfCount} ETF Products</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive(item.path, item.exact)
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Support */}
        <div className="p-4 border-t border-white/5">
          <div className="p-4 bg-dark-800 rounded-xl">
            <p className="text-sm text-gray-400 mb-3">Need help with analysis?</p>
            <button className="w-full py-2 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-500/30 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-dark-900/50 border-b border-white/5 flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Issuer Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/analysis"
              className="text-sm px-3 py-1.5 rounded-lg bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700 transition-all flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              Switch to Analyst Portal
            </Link>
            <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full text-xs flex items-center justify-center text-white">
                  {notifications}
                </span>
              )}
            </button>
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: currentIssuer.primaryColor }}
            >
              {currentIssuer.logo}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <ReportsContext.Provider value={reportsContextValue}>
            <Routes>
              <Route index element={<IssuerOverview />} />
              <Route path="registers" element={<RegistersTab />} />
              <Route path="analytics" element={<AnalyticsTab />} />
              <Route path="upload" element={<UploadRegister />} />
              <Route path="reports" element={<Reports />} />
              <Route path="reports/:id" element={<ReportDetail />} />
              <Route path="settings" element={<IssuerSettings />} />
            </Routes>
          </ReportsContext.Provider>
        </div>
      </main>
      </div>
    </>
    </IssuerContext.Provider>
  )
}

// Overview Component - Enhanced with rolling averages, activity feed, and real register data
const IssuerOverview = () => {
  const { currentIssuer } = useIssuer()
  const { getActivitiesForIssuer, markAllAsRead } = useActivities()
  const { getETFsForIssuer, getLatestReport, getRollingAverageIdentified, getReportsForIssuer } = useETFDatabase()
  const { getRegistersForIssuer } = useRegisters()
  const navigate = useNavigate()
  
  // Get real data from contexts
  const issuerETFs = getETFsForIssuer(currentIssuer.id)
  const latestReport = getLatestReport(currentIssuer.id)
  const rollingAverage = getRollingAverageIdentified(currentIssuer.id, 5)
  const recentReports = getReportsForIssuer(currentIssuer.id).slice(0, 5)
  const activities = getActivitiesForIssuer(currentIssuer.id, 10)
  
  // Get real register data
  const allRegisters = getRegistersForIssuer(currentIssuer.id)
  const pendingRegisters = allRegisters.filter(r => r.status === 'pending')
  const deliveredRegisters = allRegisters.filter(r => r.status === 'delivered')
  const recentUploads = [...allRegisters]
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, 3)
  
  // Calculate totals from actual register data
  const totalShareClasses = issuerETFs.reduce((sum, etf) => sum + etf.shareClasses.length, 0)
  const totalAUM = issuerETFs.reduce((sum, etf) => 
    sum + etf.shareClasses.reduce((scSum, sc) => scSum + sc.currentAum, 0), 0)
  
  // Calculate real ETF count from registers if available
  const uniqueETFsInRegisters = new Set<string>()
  allRegisters.forEach(reg => reg.etfs.forEach(etf => uniqueETFsInRegisters.add(etf.isin)))
  const realETFCount = uniqueETFsInRegisters.size || issuerETFs.length || currentIssuer.etfCount
  
  // Get ownership breakdown from latest report or use defaults
  const ownershipData = latestReport?.ownershipBreakdown || [
    { type: 'Wealth Managers', pct: 28, color: '#22c56d', aum: 0 },
    { type: 'Platforms', pct: 22, color: '#32a6ff', aum: 0 },
    { type: 'Private Banks', pct: 12, color: '#8b5cf6', aum: 0 },
    { type: 'Asset Managers', pct: 8, color: '#f59e0b', aum: 0 },
    { type: 'Unidentified', pct: 30, color: '#475569', aum: 0 },
  ]
  
  // Mini sparkline data for rolling average - use delivered registers if available
  const sparklineData = deliveredRegisters.length > 0
    ? deliveredRegisters
        .sort((a, b) => new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime())
        .slice(-5)
        .map((r, i) => ({ 
          report: `R${i + 1}`,
          pct: r.identifiedPct || 0 
        }))
    : recentReports.map((r, i) => ({ 
        report: `R${recentReports.length - i}`,
        pct: r.identifiedPct 
      })).reverse()
  
  // Calculate rolling average from actual delivered registers
  const realRollingAverage = deliveredRegisters.length > 0
    ? deliveredRegisters.slice(-5).reduce((sum, r) => sum + (r.identifiedPct || 0), 0) / Math.min(deliveredRegisters.length, 5)
    : rollingAverage

  const formatAUM = (value: number) => {
    if (value >= 1e12) return `€${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `€${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `€${(value / 1e6).toFixed(1)}M`
    return `€${value.toLocaleString()}`
  }

  const getActivityIcon = (type: string, status: string) => {
    switch (type) {
      case 'upload':
        return <Upload className={`w-4 h-4 ${status === 'success' ? 'text-accent-400' : 'text-primary-400'}`} />
      case 'analysis_started':
        return <TrendingUp className="w-4 h-4 text-blue-400" />
      case 'matching_complete':
      case 'analysis_complete':
        return <CheckCircle className="w-4 h-4 text-accent-400" />
      case 'report_delivered':
        return <FileText className="w-4 h-4 text-green-400" />
      case 'report_viewed':
        return <Eye className="w-4 h-4 text-primary-400" />
      case 'disclosure_response':
        return <Mail className="w-4 h-4 text-blue-400" />
      case 'large_position_change':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />
      default:
        return <FileText className="w-4 h-4 text-primary-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Stats Grid - 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ETF Products & Share Classes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Layers className="w-6 h-6 text-primary-400" />
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">This Quarter</span>
              <span className="text-sm text-accent-400">+3 products</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{realETFCount}</div>
          <div className="text-sm text-gray-500">ETF Products</div>
          <div className="text-xs text-gray-600 mt-2">
            ({totalShareClasses || Math.floor(realETFCount * 2.5)} Share Classes)
          </div>
        </motion.div>

        {/* Card 2: Total Registers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-accent-400" />
            </div>
            {pendingRegisters.length > 0 && (
              <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                {pendingRegisters.length} pending
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-white mb-1">{allRegisters.length}</div>
          <div className="text-sm text-gray-500">Share Registers</div>
          <div className="text-xs text-gray-600 mt-2">
            {deliveredRegisters.length} analyzed
          </div>
        </motion.div>

        {/* Card 3: Rolling Average Identified */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-glass rounded-xl p-6 relative overflow-hidden"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-400" />
            </div>
            {realRollingAverage > 0 && (
              <div className="flex items-center gap-1 text-sm text-accent-400">
                <ArrowUpRight className="w-4 h-4" />
                {realRollingAverage > 50 ? '+' : ''}{(realRollingAverage - 50).toFixed(1)}%
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-white mb-1">{realRollingAverage.toFixed(1)}%</div>
          <div className="text-sm text-gray-500">Avg. Identified</div>
          <div className="text-xs text-gray-600 mt-2">Rolling {Math.min(deliveredRegisters.length, 5)}-report average</div>
          {/* Mini Sparkline */}
          {sparklineData.length > 0 && (
            <div className="absolute bottom-2 right-2 w-20 h-8 opacity-50">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line 
                    type="monotone" 
                    dataKey="pct" 
                    stroke="#8b5cf6" 
                    strokeWidth={2} 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Card 4: Latest Report */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-glass rounded-xl p-6 cursor-pointer hover:bg-white/[0.03] transition-colors"
          onClick={() => latestReport && navigate(`/issuer/reports/${latestReport.id}`)}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-400" />
            </div>
            <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
              Delivered
            </span>
          </div>
          <div className="text-lg font-bold text-white mb-1">
            {latestReport ? new Date(latestReport.deliveredAt).toLocaleDateString('en-GB', { 
              day: 'numeric', month: 'short', year: 'numeric' 
            }) : '13 Jan 2026'}
          </div>
          <div className="text-sm text-gray-500">Latest Report</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="text-xs text-accent-400">{latestReport?.identifiedPct || 71.2}% identified</div>
            <ChevronRight className="w-3 h-3 text-gray-600" />
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ownership Breakdown - Enhanced with interactive legend */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Ownership Breakdown</h3>
            {latestReport && (
              <span className="text-xs text-gray-500">
                From {new Date(latestReport.registerDate).toLocaleDateString('en-GB', { 
                  day: 'numeric', month: 'short' 
                })} analysis
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ownershipData.map(o => ({ name: o.type, value: o.pct, color: o.color }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {ownershipData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {Math.round(100 - (ownershipData.find(o => o.type === 'Unidentified')?.pct || 30))}%
                  </div>
                  <div className="text-xs text-gray-500">Identified</div>
                </div>
              </div>
            </div>
            <div className="flex-1 ml-8 space-y-3">
              {ownershipData.map((item, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-400">{item.type}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-white">{item.pct}%</span>
                    {item.aum > 0 && (
                      <div className="text-xs text-gray-600">{formatAUM(item.aum)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent Activity - Using Activity Context */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            {activities.length > 0 && (
              <button 
                onClick={() => markAllAsRead(currentIssuer.id)}
                className="text-xs text-primary-400 hover:text-primary-300"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar">
            {activities.length > 0 ? activities.map((activity) => (
              <div 
                key={activity.id} 
                className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${
                  activity.read ? 'bg-dark-800/30' : 'bg-dark-800/50 border-l-2 border-primary-500'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activity.status === 'success' ? 'bg-accent-500/20' :
                  activity.status === 'warning' ? 'bg-yellow-500/20' :
                  activity.status === 'error' ? 'bg-red-500/20' :
                  'bg-primary-500/20'
                }`}>
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(activity.timestamp)}</p>
                </div>
                {activity.metadata?.identifiedPct && (
                  <div className="text-xs text-accent-400 font-medium">
                    {activity.metadata.identifiedPct}%
                  </div>
                )}
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Top Holders - Only show if we have report data */}
      {latestReport && latestReport.topHolders.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Top Holders</h3>
            <Link to="/issuer/analytics" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View Analytics <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {latestReport.topHolders.slice(0, 5).map((holder, i) => (
              <div key={i} className="bg-dark-800/50 rounded-lg p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6 text-primary-400" />
                </div>
                <div className="text-sm font-medium text-white truncate">{holder.name}</div>
                <div className="text-xs text-gray-500 mt-1">{holder.type}</div>
                <div className="text-lg font-bold text-accent-400 mt-2">{formatAUM(holder.aum)}</div>
                <div className="text-xs text-gray-600">{holder.pct}% of total</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Uploads - From RegisterContext */}
      {recentUploads.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Uploads</h3>
            <Link to="/issuer/registers" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentUploads.map((reg) => (
              <div 
                key={reg.id}
                className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{reg.fileName}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(reg.uploadDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' • '}{reg.etfs.length} ETFs{' • '}{reg.totalHolders} holders
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {reg.status === 'pending' && (
                    <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                      Pending
                    </span>
                  )}
                  {reg.status === 'in_progress' && (
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                      In Progress
                    </span>
                  )}
                  {reg.status === 'delivered' && (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-full text-xs bg-accent-500/20 text-accent-400">
                        {reg.identifiedPct?.toFixed(1)}% identified
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Key Alerts & Distribution Opportunities - Executive Features */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Key Alerts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              Key Alerts
            </h3>
            <span className="text-xs text-gray-500">For Distribution Team</span>
          </div>
          <div className="space-y-3">
            {pendingRegisters.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-yellow-400">
                    {pendingRegisters.length} Register{pendingRegisters.length !== 1 ? 's' : ''} Pending Analysis
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Oldest: {pendingRegisters.length > 0 && new Date(
                      [...pendingRegisters].sort((a, b) => new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime())[0].uploadDate
                    ).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/analysis')}
                  className="ml-auto px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30"
                >
                  View
                </button>
              </div>
            )}
            
            {/* Simulated alerts based on data patterns */}
            {realRollingAverage < 70 && (
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Eye className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-blue-400">
                    Identified Rate Below Target
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Current: {realRollingAverage.toFixed(1)}% (target: 70%+)
                  </div>
                </div>
              </div>
            )}
            
            {deliveredRegisters.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-accent-500/10 border border-accent-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-accent-400">
                    Latest Analysis Complete
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {deliveredRegisters[deliveredRegisters.length - 1]?.identifiedPct?.toFixed(1)}% identified
                    {' - '}{new Date(deliveredRegisters[deliveredRegisters.length - 1]?.uploadDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/issuer/reports')}
                  className="ml-auto px-3 py-1 bg-accent-500/20 text-accent-400 rounded text-xs hover:bg-accent-500/30"
                >
                  View
                </button>
              </div>
            )}
            
            {pendingRegisters.length === 0 && deliveredRegisters.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No alerts at this time</p>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Distribution Opportunities */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-400" />
              Distribution Opportunities
            </h3>
            <Link to="/issuer/analytics" className="text-xs text-primary-400 hover:text-primary-300">
              View Details
            </Link>
          </div>
          <div className="space-y-3">
            {/* Analyze ownership breakdown for opportunities */}
            {ownershipData.filter(o => o.type !== 'Unidentified').map((segment, i) => {
              const isUnderrepresented = segment.pct < 15
              const hasGrowthPotential = segment.pct > 10 && segment.pct < 25
              
              return (
                <div 
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isUnderrepresented 
                      ? 'bg-amber-500/10 border border-amber-500/20' 
                      : hasGrowthPotential
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-dark-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: segment.color }}
                    />
                    <div>
                      <div className="text-sm font-medium text-white">{segment.type}</div>
                      <div className="text-xs text-gray-500">
                        {isUnderrepresented && '⚠️ Underrepresented segment'}
                        {hasGrowthPotential && '📈 Growth potential'}
                        {!isUnderrepresented && !hasGrowthPotential && 'Stable coverage'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{segment.pct}%</div>
                    <div className={`text-xs ${
                      isUnderrepresented ? 'text-amber-400' : hasGrowthPotential ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {isUnderrepresented && 'Target: 20%+'}
                      {hasGrowthPotential && 'Room to grow'}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Unidentified segment - always show as opportunity */}
            {ownershipData.find(o => o.type === 'Unidentified') && (
              <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">
                      {ownershipData.find(o => o.type === 'Unidentified')?.pct}% Unidentified
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">Potential new relationships</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions - Enhanced */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Link 
          to="/issuer/upload"
          className="card-glass rounded-xl p-5 hover:bg-white/[0.03] transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
              <Upload className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Upload Register</div>
              <div className="text-xs text-gray-500">New share data</div>
            </div>
          </div>
        </Link>
        
        <Link 
          to="/issuer/registers"
          className="card-glass rounded-xl p-5 hover:bg-white/[0.03] transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">View Registers</div>
              <div className="text-xs text-gray-500">{allRegisters.length} total</div>
            </div>
          </div>
        </Link>
        
        <Link 
          to="/issuer/analytics"
          className="card-glass rounded-xl p-5 hover:bg-white/[0.03] transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center group-hover:bg-accent-500/30 transition-colors">
              <TrendingUp className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Analytics</div>
              <div className="text-xs text-gray-500">NNA & trends</div>
            </div>
          </div>
        </Link>
        
        <Link 
          to="/issuer/reports"
          className="card-glass rounded-xl p-5 hover:bg-white/[0.03] transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Reports</div>
              <div className="text-xs text-gray-500">{getReportsForIssuer(currentIssuer.id).length} delivered</div>
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  )
}

// Analytics Tab Component - NNA Analysis and Ownership Trends (Using Real Data)
const AnalyticsTab = () => {
  const { currentIssuer } = useIssuer()
  const { getETFsForIssuer, getReportsForIssuer, calculateNNA, getLatestReport, getNAVHistory } = useETFDatabase()
  const { getRegistersForIssuer } = useRegisters()
  
  // Date range state
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [quickSelect, setQuickSelect] = useState<string>('1y')
  const [selectedClientTypes, setSelectedClientTypes] = useState<string[]>([
    'Wealth Managers', 'Platforms', 'Private Banks', 'Asset Managers', 'Family Offices', 'Institutions'
  ])
  
  const issuerETFs = getETFsForIssuer(currentIssuer.id)
  const reports = getReportsForIssuer(currentIssuer.id)
  const latestReport = getLatestReport(currentIssuer.id)
  const registers = getRegistersForIssuer(currentIssuer.id)
  
  // Sort registers by date - useMemo to prevent unnecessary recalculations
  const sortedRegisters = useMemo(() => {
    return [...registers].sort((a, b) => 
      new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
    )
  }, [registers])
  
  // Filter registers by date range - useMemo with dateRange dependency
  const filteredRegisters = useMemo(() => {
    const startTime = new Date(dateRange.start).getTime()
    const endTime = new Date(dateRange.end).setHours(23, 59, 59, 999) // Include full end day
    
    const filtered = sortedRegisters.filter(reg => {
      const regDate = new Date(reg.registerDate || reg.uploadDate).getTime()
      return regDate >= startTime && regDate <= endTime
    })
    
    console.log(`Date filter: ${dateRange.start} to ${dateRange.end}`)
    console.log(`Filtered ${filtered.length} of ${sortedRegisters.length} registers`)
    
    return filtered
  }, [sortedRegisters, dateRange.start, dateRange.end])
  
  // Quick select handlers
  const handleQuickSelect = (period: string) => {
    setQuickSelect(period)
    const now = new Date()
    let start: Date
    
    switch (period) {
      case '30d':
        // Go back 40 days to capture 2 monthly registers (registers are on ~17th of each month)
        // This ensures we get Jan and Dec registers for NNA calculation
        start = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        // Go back 100 days to capture 4 monthly registers (Oct 17 through Jan 17)
        // This gives us 3 NNA bars (Oct→Nov, Nov→Dec, Dec→Jan)
        start = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        // Go back 400 days to ensure we capture all 13 monthly registers
        start = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000)
        break
      case 'ytd':
        start = new Date(now.getFullYear(), 0, 1)
        break
      default:
        start = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000)
    }
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    })
  }

  // Helper: Get average NAV for an ETF from ETF database
  const getAverageNAV = (isin: string): number => {
    const navHistory = getNAVHistory(isin)
    if (navHistory.length > 0) {
      return navHistory.reduce((sum, h) => sum + h.nav, 0) / navHistory.length
    }
    // Fallback if no NAV data available
    return 50
  }
  
  // Helper: Check if nominee is an investment decision maker (NOT a custodian/CSD)
  const isInvestmentDecisionMaker = (nomineeName: string): boolean => {
    const nameLower = nomineeName.toLowerCase()
    
    // FIRST: Check if it's a known investment decision maker (these ARE terminal)
    const knownDecisionMakers = [
      // Wealth Managers
      'brewin dolphin', 'rathbone', 'evelyn partners', 'quilter', 'charles stanley',
      'brooks macdonald', 'canaccord', 'investec wealth', 'saltus', 'tilney',
      // Private Banks
      'coutts', 'hsbc private', 'barclays private', 'ubs wealth', 'julius baer',
      // Platforms
      'hargreaves', 'interactive investor', 'aj bell', 'fidelity platform', 'vanguard investor',
      // Asset Managers
      'legal & general', 'schroders invest', 'abrdn', 'm&g', 'aviva investors',
      'blackrock', 'vanguard', 'fidelity', 'invesco', 'pimco',
      // Institutions (Pension Funds, Sovereign Wealth, Charities, Endowments)
      'pension', 'superannuation', 'retirement fund', 'sovereign wealth',
      'charity', 'charitable', 'endowment', 'foundation',
      'uss ', 'nest ', 'teachers', 'calpers', 'church commissioners', 'wellcome',
      // Family Offices
      'family office', 'sandaire', 'stonehage', 'stanhope', 'bessemer'
    ]
    
    if (knownDecisionMakers.some(term => nameLower.includes(term))) {
      return true
    }
    
    // SECOND: Check if it's an intermediary (NOT a decision maker)
    const intermediaries = [
      'euroclear', 'clearstream', 'crest', 'dtc', 'jasdec', // CSDs
      'state street', 'bny mellon', 'jp morgan', 'jpmorgan', 'citibank', 'citi bank',
      'northern trust global', 'hsbc global custody', 'deutsche bank custody', 
      'bbh', 'brown brothers', 'societe generale', 'credit agricole', 
      'mizuho custody', 'standard chartered custody',
      'caceis', 'bnp paribas securities', // Custodians
      'vidacos', 'pershing securities', 'rbc investor services' // Pooled
    ]
    
    return !intermediaries.some(term => nameLower.includes(term))
  }
  
  // Helper: Get client type for investment decision makers
  const getClientType = (nomineeName: string): string => {
    const nameLower = nomineeName.toLowerCase()
    
    // Platforms (Execution-only)
    if (nameLower.includes('hargreaves') || nameLower.includes('aj bell') || 
        nameLower.includes('interactive investor') || nameLower.includes('fidelity platform') ||
        nameLower.includes('vanguard investor') || nameLower.includes('trading 212')) {
      return 'Platform'
    }
    // Wealth Managers
    if (nameLower.includes('brewin') || nameLower.includes('rathbone') || 
        nameLower.includes('quilter') || nameLower.includes("st. james") || nameLower.includes("st james") ||
        nameLower.includes('evelyn') || nameLower.includes('tilney') || nameLower.includes('charles stanley') ||
        nameLower.includes('brooks macdonald') || nameLower.includes('canaccord') || nameLower.includes('saltus') ||
        nameLower.includes('investec wealth')) {
      return 'Wealth Manager'
    }
    // Private Banks
    if (nameLower.includes('coutts') || nameLower.includes('barclays private') || 
        nameLower.includes('hsbc private') || nameLower.includes('ubs wealth') ||
        nameLower.includes('credit suisse') || nameLower.includes('julius baer') ||
        nameLower.includes('schroders wealth') || nameLower.includes('deutsche bank wealth')) {
      return 'Private Bank'
    }
    // Institutions (Pension Funds, Sovereign Wealth, Charities, Endowments, Insurance)
    if (nameLower.includes('pension') || nameLower.includes('superannuation') ||
        nameLower.includes('retirement') || nameLower.includes('sovereign wealth') ||
        nameLower.includes('charity') || nameLower.includes('charitable') ||
        nameLower.includes('endowment') || nameLower.includes('foundation') ||
        nameLower.includes('insurance') || nameLower.includes('assurance') ||
        nameLower.includes('uss ') || nameLower.includes('nest ') ||
        nameLower.includes('teachers') || nameLower.includes('calpers') ||
        nameLower.includes('church commissioners') || nameLower.includes('wellcome')) {
      return 'Institution'
    }
    // Asset Managers (fund management companies)
    if (nameLower.includes('blackrock') || nameLower.includes('vanguard') ||
        nameLower.includes('fidelity') || nameLower.includes('schroders invest') ||
        nameLower.includes('abrdn') || nameLower.includes('legal & general') || 
        nameLower.includes('m&g') || nameLower.includes('aviva investors') ||
        nameLower.includes('jpmorgan asset') || nameLower.includes('state street global') ||
        nameLower.includes('invesco') || nameLower.includes('pimco') ||
        nameLower.includes('wellington') || nameLower.includes('capital group')) {
      return 'Asset Manager'
    }
    // Family Offices
    if (nameLower.includes('family office') || nameLower.includes('family inv') ||
        nameLower.includes('sandaire') || nameLower.includes('stonehage') ||
        nameLower.includes('stanhope') || nameLower.includes('bessemer')) {
      return 'Family Office'
    }
    
    return 'Other'
  }
  
  // Date range will be determined from calculateTopMovers with precise register dates

  // Map display names to getClientType values
  const clientTypeMap: Record<string, string> = useMemo(() => ({
    'Wealth Managers': 'Wealth Manager',
    'Platforms': 'Platform',
    'Private Banks': 'Private Bank',
    'Asset Managers': 'Asset Manager',
    'Family Offices': 'Family Office',
    'Institutions': 'Institution'
  }), [])
  
  // Check if client type is selected in filter - depends on selectedClientTypes
  const isClientTypeSelected = useCallback((type: string): boolean => {
    const selected = selectedClientTypes.some(selected => clientTypeMap[selected] === type)
    return selected
  }, [selectedClientTypes, clientTypeMap])

  // Calculate real NNA data using CORRECT formula: (End Shares - Start Shares) × End NAV
  // useMemo ensures recalculation when filters change
  const nnaData = useMemo(() => {
    console.log(`Calculating NNA with ${filteredRegisters.length} registers, ${selectedClientTypes.length} client types selected`)
    
    if (filteredRegisters.length < 2) {
      // Not enough data in selected range
      return []
    }
    
    const data: { month: string; nna: number; inflows: number; outflows: number }[] = []
    
    for (let i = 1; i < filteredRegisters.length; i++) {
      const prevReg = filteredRegisters[i - 1]
      const currReg = filteredRegisters[i]
      
      // Calculate NNA at nominee level, filtered by client type
      let totalNNA = 0
      
      currReg.nominees.forEach(nominee => {
        // Only include investment decision makers matching selected client types
        if (!isInvestmentDecisionMaker(nominee.name)) return
        
        const clientType = getClientType(nominee.name)
        if (!isClientTypeSelected(clientType)) return
        
        const prevNominee = prevReg.nominees.find(n => n.name === nominee.name)
        
        // Calculate NNA for this nominee across all their ETF holdings
        Object.entries(nominee.holdings).forEach(([isin, endShares]) => {
          const startShares = prevNominee?.holdings?.[isin] || 0
          const shareChange = endShares - startShares
          const endNAV = getAverageNAV(isin)
          // NNA = (End Shares - Start Shares) × End NAV
          const etfNNA = (shareChange * endNAV) / 1e9 // Convert to billions
          totalNNA += etfNNA
        })
      })
      
      // Include year in label if data spans multiple years or isn't current year
      const regDate = new Date(currReg.registerDate || currReg.uploadDate)
      const currentYear = new Date().getFullYear()
      const regYear = regDate.getFullYear()
      const includeYear = regYear !== currentYear || (i > 0 && new Date(filteredRegisters[i-1].registerDate || filteredRegisters[i-1].uploadDate).getFullYear() !== regYear)
      
      const month = includeYear 
        ? regDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
        : regDate.toLocaleDateString('en-GB', { month: 'short' })
      
      // Simulate inflows/outflows (in reality would come from creation/redemption data)
      const inflows = totalNNA > 0 ? totalNNA * 1.2 : Math.abs(totalNNA) * 0.3
      const outflows = totalNNA < 0 ? totalNNA * 1.2 : -Math.abs(totalNNA) * 0.2
      
      data.push({
        month,
        nna: Math.round(totalNNA * 100) / 100,
        inflows: Math.round(inflows * 100) / 100,
        outflows: Math.round(outflows * 100) / 100
      })
    }
    
    return data
  }, [filteredRegisters, selectedClientTypes, isClientTypeSelected])
  
  // Client type evolution - calculate from REGISTER data with discovery rate applied
  // This reflects the actual discovery % (e.g., 90%+ means most custodian shares are now identified)
  const clientEvolutionData = useMemo(() => {
    if (filteredRegisters.length === 0) {
      return []
    }
    
    return filteredRegisters.map((register) => {
      const date = new Date(register.registerDate || register.uploadDate)
      const monthYear = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
      
      // Get discovery rate for this register (how much we've identified)
      const discoveryRate = (register.identifiedPct || 0) / 100
      
      // Calculate ownership breakdown by client type
      let totalIdentifiedShares = 0
      let custodianShares = 0
      const typeShares: Record<string, number> = {
        wealthManagers: 0,
        platforms: 0,
        privateBanks: 0,
        assetManagers: 0,
        institutions: 0,
        familyOffices: 0,
        unidentified: 0
      }
      
      register.nominees.forEach(nominee => {
        const shares = nominee.totalShares
        
        if (isInvestmentDecisionMaker(nominee.name)) {
          // Already identified - count directly
          const clientType = getClientType(nominee.name)
          switch (clientType) {
            case 'Wealth Manager':
              typeShares.wealthManagers += shares
              break
            case 'Platform':
              typeShares.platforms += shares
              break
            case 'Private Bank':
              typeShares.privateBanks += shares
              break
            case 'Asset Manager':
              typeShares.assetManagers += shares
              break
            case 'Institution':
              typeShares.institutions += shares
              break
            case 'Family Office':
              typeShares.familyOffices += shares
              break
            default:
              typeShares.unidentified += shares
          }
          totalIdentifiedShares += shares
        } else {
          // Custodian/CSD - distribute based on discovery rate
          custodianShares += shares
        }
      })
      
      // Distribute custodian shares according to discovery rate
      // Discovered portion gets distributed proportionally to identified types
      // Undiscovered portion stays as "unidentified"
      const discoveredCustodianShares = custodianShares * discoveryRate
      const undiscoveredCustodianShares = custodianShares * (1 - discoveryRate)
      
      if (totalIdentifiedShares > 0) {
        // Distribute discovered custodian shares proportionally to identified client types
        const totalKnown = totalIdentifiedShares
        typeShares.wealthManagers += discoveredCustodianShares * (typeShares.wealthManagers / totalKnown)
        typeShares.platforms += discoveredCustodianShares * (typeShares.platforms / totalKnown)
        typeShares.privateBanks += discoveredCustodianShares * (typeShares.privateBanks / totalKnown)
        typeShares.assetManagers += discoveredCustodianShares * (typeShares.assetManagers / totalKnown)
        typeShares.institutions += discoveredCustodianShares * (typeShares.institutions / totalKnown)
        typeShares.familyOffices += discoveredCustodianShares * (typeShares.familyOffices / totalKnown)
      } else {
        // No identified clients yet, so discovered custodian shares distributed evenly
        typeShares.wealthManagers += discoveredCustodianShares * 0.30
        typeShares.platforms += discoveredCustodianShares * 0.25
        typeShares.privateBanks += discoveredCustodianShares * 0.15
        typeShares.assetManagers += discoveredCustodianShares * 0.12
        typeShares.institutions += discoveredCustodianShares * 0.13
        typeShares.familyOffices += discoveredCustodianShares * 0.05
      }
      
      typeShares.unidentified += undiscoveredCustodianShares
      
      const totalShares = totalIdentifiedShares + custodianShares
      
      // Convert to percentages
      return {
        period: monthYear,
        wealthManagers: totalShares > 0 ? Math.round((typeShares.wealthManagers / totalShares) * 1000) / 10 : 0,
        platforms: totalShares > 0 ? Math.round((typeShares.platforms / totalShares) * 1000) / 10 : 0,
        privateBanks: totalShares > 0 ? Math.round((typeShares.privateBanks / totalShares) * 1000) / 10 : 0,
        assetManagers: totalShares > 0 ? Math.round((typeShares.assetManagers / totalShares) * 1000) / 10 : 0,
        institutions: totalShares > 0 ? Math.round((typeShares.institutions / totalShares) * 1000) / 10 : 0,
        familyOffices: totalShares > 0 ? Math.round((typeShares.familyOffices / totalShares) * 1000) / 10 : 0,
        unidentified: totalShares > 0 ? Math.round((typeShares.unidentified / totalShares) * 1000) / 10 : 0,
      }
    })
  }, [filteredRegisters])
  
  // Calculate top movers - useMemo ensures recalculation when filters change
  const topMoversResult = useMemo(() => {
    if (filteredRegisters.length < 2) {
      const fallbackStartDate = dateRange.start ? new Date(dateRange.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
      const fallbackEndDate = dateRange.end ? new Date(dateRange.end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
      
      return {
        data: [],
        startDate: fallbackStartDate,
        endDate: fallbackEndDate
      }
    }
    
    const firstReg = filteredRegisters[0]
    const lastReg = filteredRegisters[filteredRegisters.length - 1]
    
    const startDate = new Date(firstReg.registerDate || firstReg.uploadDate).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    })
    const endDate = new Date(lastReg.registerDate || lastReg.uploadDate).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    })
    
    const changes: { name: string; type: string; startShares: number; endShares: number; nna: number; changePct: number }[] = []
    
    lastReg.nominees.forEach(nominee => {
      if (!isInvestmentDecisionMaker(nominee.name)) return
      
      const clientType = getClientType(nominee.name)
      if (!isClientTypeSelected(clientType)) return
      
      const startNominee = firstReg.nominees.find(n => n.name === nominee.name)
      const startShares = startNominee?.totalShares || 0
      const endShares = nominee.totalShares
      
      let totalNNA = 0
      Object.entries(nominee.holdings).forEach(([isin, shares]) => {
        const startHolding = startNominee?.holdings?.[isin] || 0
        const shareChange = shares - startHolding
        const endNAV = getAverageNAV(isin)
        totalNNA += shareChange * endNAV
      })
      
      const changePct = startShares > 0 ? ((endShares - startShares) / startShares) * 100 : (endShares > 0 ? 100 : 0)
      const nnaMillion = totalNNA / 1e6
      
      if (Math.abs(nnaMillion) > 0.1 || endShares > 100000) {
        changes.push({
          name: nominee.name,
          type: clientType,
          startShares,
          endShares,
          nna: Math.round(nnaMillion * 10) / 10,
          changePct: Math.round(changePct * 10) / 10
        })
      }
    })
    
    return { 
      data: changes.sort((a, b) => Math.abs(b.nna) - Math.abs(a.nna)).slice(0, 10), 
      startDate, 
      endDate 
    }
  }, [filteredRegisters, selectedClientTypes, isClientTypeSelected, dateRange.start, dateRange.end])
  
  const topMovers = topMoversResult.data
  const registerStartDate = topMoversResult.startDate
  const registerEndDate = topMoversResult.endDate
  
  // Calculate total unidentified AUM from reports
  // "Unidentified" = custodians/CSDs where we HAVEN'T successfully drilled down yet
  const calculateUnidentifiedAUM = () => {
    const sortedReports = reports.sort((a, b) => 
      new Date(a.registerDate || a.deliveredAt).getTime() - new Date(b.registerDate || b.deliveredAt).getTime()
    )
    
    if (sortedReports.length < 2) return { startAum: 0, endAum: 0 }
    
    const firstReport = sortedReports[0]
    const lastReport = sortedReports[sortedReports.length - 1]
    
    // Get "Unidentified" from ownership breakdown
    const startUnidentified = firstReport.ownershipBreakdown?.find(o => o.type === 'Unidentified')
    const endUnidentified = lastReport.ownershipBreakdown?.find(o => o.type === 'Unidentified')
    
    return { 
      startAum: Math.round((startUnidentified?.aum || 0) / 1e6), 
      endAum: Math.round((endUnidentified?.aum || 0) / 1e6) 
    }
  }
  
  const unidentifiedAUM = calculateUnidentifiedAUM()
  
  // Calculate ETF performance using CORRECT formula: (End Shares - Start Shares) × End NAV
  // Calculate ETF performance - useMemo ensures recalculation when filteredRegisters changes
  // NOTE: ETF-level performance is NOT filtered by client type (shows total ETF flows)
  const etfPerformance = useMemo(() => {
    if (filteredRegisters.length < 2) {
      return []
    }
    
    const firstReg = filteredRegisters[0]
    const lastReg = filteredRegisters[filteredRegisters.length - 1]
    
    return lastReg.etfs.map(etf => {
      const firstETF = firstReg.etfs.find(e => e.isin === etf.isin)
      const startShares = firstETF?.totalShares || 0
      const endShares = etf.totalShares
      
      // Get END NAV from ETF database (sourced from Yahoo Finance)
      const endNAV = getAverageNAV(etf.isin)
      
      // CORRECT NNA FORMULA: (End Shares - Start Shares) × End NAV
      // This isolates flows and excludes price appreciation
      const shareChange = endShares - startShares
      const nnaValue = (shareChange * endNAV) / 1e9 // Convert to billions
      
      // Shorten the name
      const shortName = etf.name
        .replace('UCITS ETF', '')
        .replace('iShares Core', '')
        .replace('Vanguard', '')
        .replace('Amundi', '')
        .trim()
        .slice(0, 20)
      
      return {
        name: shortName || etf.isin.slice(-4),
        nna: Math.round(nnaValue * 100) / 100
      }
    }).sort((a, b) => b.nna - a.nna).slice(0, 8)
  }, [filteredRegisters])
  
  // Summary statistics - useMemo with nnaData dependency
  const { totalNNA, avgMonthlyNNA, bestMonth } = useMemo(() => {
    if (nnaData.length === 0) {
      return { totalNNA: 0, avgMonthlyNNA: 0, bestMonth: { month: 'N/A', nna: 0 } }
    }
    const total = nnaData.reduce((sum, d) => sum + d.nna, 0)
    const avg = total / nnaData.length
    const best = nnaData.reduce((best, d) => d.nna > best.nna ? d : best, nnaData[0])
    return { totalNNA: total, avgMonthlyNNA: avg, bestMonth: best }
  }, [nnaData])

  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 1) return `€${val.toFixed(1)}B`
    return `€${(val * 1000).toFixed(0)}M`
  }
  
  const formatAUM = (value: number) => {
    if (value >= 1e12) return `€${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `€${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `€${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `€${(value / 1e3).toFixed(0)}K`
    return `€${value.toLocaleString()}`
  }

  const toggleClientType = (type: string) => {
    setSelectedClientTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass rounded-xl p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Analytics & Insights</h2>
            <p className="text-sm text-gray-500 mt-1">
              Analyze ownership trends, NNA flows, and client evolution for {currentIssuer.name}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">
                {filteredRegisters.length} of {sortedRegisters.length} registers in selected range
              </span>
              {filteredRegisters.length < 2 && (
                <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                  Need 2+ registers for comparisons
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Date Range */}
            <div className="flex items-center gap-2 bg-dark-800/50 rounded-lg p-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-transparent text-sm text-white border-none outline-none w-32"
              />
              <span className="text-gray-600">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-transparent text-sm text-white border-none outline-none w-32"
              />
            </div>
            
            {/* Quick Select */}
            <div className="flex items-center gap-1">
              {[
                { key: '30d', label: '30D' },
                { key: '90d', label: '90D' },
                { key: 'ytd', label: 'YTD' },
                { key: '1y', label: '1Y' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleQuickSelect(key)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    quickSelect === key
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-800/50 text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {/* Export Button */}
            <button className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>
        
        {/* Client Type Filters */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
          <span className="text-sm text-gray-500 mr-2">Filter by:</span>
          {[
            { key: 'Wealth Managers', color: '#22c56d' },
            { key: 'Platforms', color: '#32a6ff' },
            { key: 'Private Banks', color: '#8b5cf6' },
            { key: 'Asset Managers', color: '#f59e0b' },
            { key: 'Institutions', color: '#ec4899' },
            { key: 'Family Offices', color: '#06b6d4' },
          ].map(({ key, color }) => (
            <button
              key={key}
              onClick={() => toggleClientType(key)}
              className={`px-3 py-1 rounded-full text-xs flex items-center gap-2 transition-all ${
                selectedClientTypes.includes(key)
                  ? 'bg-white/10 text-white'
                  : 'bg-transparent text-gray-500 opacity-50'
              }`}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {key}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="text-sm text-gray-500 mb-2">Total NNA (Period)</div>
          <div className={`text-3xl font-bold ${totalNNA >= 0 ? 'text-accent-400' : 'text-red-400'}`}>
            {formatCurrency(totalNNA)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {totalNNA >= 0 ? 'Net Inflows' : 'Net Outflows'}
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="text-sm text-gray-500 mb-2">Avg. Monthly NNA</div>
          <div className={`text-3xl font-bold ${avgMonthlyNNA >= 0 ? 'text-accent-400' : 'text-red-400'}`}>
            {formatCurrency(avgMonthlyNNA)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Per month average</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="text-sm text-gray-500 mb-2">Best Month</div>
          <div className="text-3xl font-bold text-accent-400">
            {bestMonth.month}
          </div>
          <div className="text-xs text-gray-600 mt-1">{formatCurrency(bestMonth.nna)} NNA</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card-glass rounded-xl p-6"
        >
          <div className="text-sm text-gray-500 mb-2">Identification Trend</div>
          <div className="text-3xl font-bold text-purple-400">+13.0%</div>
          <div className="text-xs text-gray-600 mt-1">54% → 67% (YoY)</div>
        </motion.div>
      </div>

      {/* NNA Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-glass rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Net New Assets Over Time</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent-400" />
              <span className="text-xs text-gray-500">Net NNA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="text-xs text-gray-500">Inflows</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <span className="text-xs text-gray-500">Outflows</span>
            </div>
          </div>
        </div>
        
        {nnaData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nnaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickFormatter={(val) => `€${val}B`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a2e', 
                    border: '1px solid #2d2d44',
                    borderRadius: '8px'
                  }}
                  formatter={(val: number) => [`€${val.toFixed(1)}B`]}
                />
                <Bar dataKey="nna" fill="#22c56d" radius={[4, 4, 0, 0]}>
                  {nnaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.nna >= 0 ? '#22c56d' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
              <p className="text-gray-500 text-sm">Not enough data in selected range</p>
              <p className="text-gray-600 text-xs mt-1">
                {filteredRegisters.length === 0 
                  ? 'No registers found in this date range'
                  : `Need 2+ registers for comparison (found ${filteredRegisters.length})`
                }
              </p>
            </div>
          </div>
        )}
        
        {/* Formula Note */}
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-400">
              <span className="text-green-400 font-medium">NNA Formula:</span> (End Shares - Start Shares) × End NAV per ETF. 
              This isolates net flows and <strong className="text-white">excludes price appreciation/depreciation</strong>, showing only investor activity.
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Client Evolution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card-glass rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-6">Client Type Evolution</h3>
          {clientEvolutionData.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={clientEvolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(val) => `${val}%`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a2e', 
                        border: '1px solid #2d2d44',
                        borderRadius: '8px'
                      }}
                      formatter={(val: number) => [`${val.toFixed(1)}%`]}
                    />
                    <Area type="monotone" dataKey="wealthManagers" stackId="1" stroke="#22c56d" fill="#22c56d" fillOpacity={0.6} name="Wealth Managers" />
                    <Area type="monotone" dataKey="platforms" stackId="1" stroke="#32a6ff" fill="#32a6ff" fillOpacity={0.6} name="Platforms" />
                    <Area type="monotone" dataKey="privateBanks" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Private Banks" />
                    <Area type="monotone" dataKey="assetManagers" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Asset Managers" />
                    <Area type="monotone" dataKey="institutions" stackId="1" stroke="#ec4899" fill="#ec4899" fillOpacity={0.6} name="Institutions" />
                    <Area type="monotone" dataKey="familyOffices" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} name="Family Offices" />
                    <Area type="monotone" dataKey="unidentified" stackId="1" stroke="#475569" fill="#475569" fillOpacity={0.6} name="Unidentified" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c56d' }} />
                  <span className="text-xs text-gray-400">Wealth Managers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#32a6ff' }} />
                  <span className="text-xs text-gray-400">Platforms</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#8b5cf6' }} />
                  <span className="text-xs text-gray-400">Private Banks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }} />
                  <span className="text-xs text-gray-400">Asset Managers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ec4899' }} />
                  <span className="text-xs text-gray-400">Institutions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#06b6d4' }} />
                  <span className="text-xs text-gray-400">Family Offices</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#475569' }} />
                  <span className="text-xs text-gray-400">Unidentified</span>
                </div>
              </div>
              
              <div className="mt-3 text-center text-xs text-gray-500">
                {clientEvolutionData.length} data points in selected range
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <PieChart className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
                <p className="text-gray-500 text-sm">No reports in selected date range</p>
                <p className="text-gray-600 text-xs mt-1">Select a wider date range to see data</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* ETF Performance Heat Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-glass rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-6">ETF NNA Performance</h3>
          {etfPerformance.length > 0 ? (
            <div className="space-y-3">
              {etfPerformance.map((etf, i) => {
                const maxNNA = Math.max(...etfPerformance.map(e => Math.abs(e.nna)))
                const width = (Math.abs(etf.nna) / maxNNA) * 100
                const isPositive = etf.nna >= 0
                
                return (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-gray-400 truncate">{etf.name}</div>
                    <div className="flex-1 h-6 bg-dark-800/50 rounded relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
                        className={`h-full rounded ${isPositive ? 'bg-accent-400' : 'bg-red-400'}`}
                      />
                    </div>
                    <div className={`w-20 text-sm font-medium text-right ${isPositive ? 'text-accent-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}€{etf.nna.toFixed(1)}B
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
                <p className="text-gray-500 text-sm">Not enough data in selected range</p>
                <p className="text-gray-600 text-xs mt-1">Need 2+ registers for comparison</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-accent-400" />
              <span>Inflows</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-400" />
              <span>Outflows</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Movers Table - Investment Decision Makers Only */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="card-glass rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Top Position Changes</h3>
            <p className="text-xs text-gray-500 mt-1">
              Investment decision makers only • Based on share register data
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Unidentified (Custodians/CSDs)</div>
            <div className="text-sm font-medium text-gray-400">
              €{formatAUM(unidentifiedAUM.endAum * 1e6)} AUM
            </div>
          </div>
        </div>
        
        {topMovers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Entity</th>
                  <th className="text-left">Type</th>
                  <th className="text-right">
                    <div className="text-xs text-gray-400 font-normal">{registerStartDate}</div>
                    <div>Start Shares</div>
                  </th>
                  <th className="text-right">
                    <div className="text-xs text-gray-400 font-normal">{registerEndDate}</div>
                    <div>End Shares</div>
                  </th>
                  <th className="text-right">NNA</th>
                  <th className="text-right">% Change</th>
                </tr>
              </thead>
              <tbody>
                {topMovers.map((mover, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="font-medium text-white">{mover.name}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        mover.type === 'Platform' ? 'bg-blue-500/20 text-blue-400' :
                        mover.type === 'Wealth Manager' ? 'bg-green-500/20 text-green-400' :
                        mover.type === 'Private Bank' ? 'bg-purple-500/20 text-purple-400' :
                        mover.type === 'Institution' ? 'bg-amber-500/20 text-amber-400' :
                        mover.type === 'Family Office' ? 'bg-pink-500/20 text-pink-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {mover.type}
                      </span>
                    </td>
                    <td className="text-right text-gray-400 font-mono text-sm">
                      {mover.startShares.toLocaleString()}
                    </td>
                    <td className="text-right text-white font-medium font-mono text-sm">
                      {mover.endShares.toLocaleString()}
                    </td>
                    <td className={`text-right font-medium ${mover.nna >= 0 ? 'text-accent-400' : 'text-red-400'}`}>
                      {mover.nna >= 0 ? '+' : ''}€{Math.abs(mover.nna) >= 1000 
                        ? `${(mover.nna / 1000).toFixed(1)}B` 
                        : `${mover.nna.toFixed(1)}M`}
                    </td>
                    <td className={`text-right ${mover.changePct >= 0 ? 'text-accent-400' : 'text-red-400'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {mover.changePct >= 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {mover.changePct >= 0 ? '+' : ''}{mover.changePct.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No identified investment decision makers found</p>
            <p className="text-xs mt-1">All positions are held through custodians/CSDs requiring disclosure</p>
          </div>
        )}
        
        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-400">
              <span className="text-blue-400 font-medium">NNA Formula:</span> (End Shares - Start Shares) × End NAV — this isolates pure investor flows, <strong className="text-white">excluding price movements</strong>.
              Only <strong className="text-white">identified investment decision makers</strong> are shown (wealth managers, private banks, platforms).
              Custodians/CSDs with undisclosed ownership are rolled into "Unidentified".
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Upload Register Component
const UploadRegister = () => {
  const navigate = useNavigate()
  const { currentIssuer } = useIssuer()
  const { addRegister } = useRegisters()
  const [uploadMethod, setUploadMethod] = useState<'manual' | 'api' | 'email'>('manual')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [authorizationSigned, setAuthorizationSigned] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      setUploadedFile(files[0])
      setUploadResult(null)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0])
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!uploadedFile || !authorizationSigned) return
    
    setIsUploading(true)
    
    try {
      // Read the CSV file
      const csvContent = await uploadedFile.text()
      
      // Parse the CSV and create a register
      const register = parseCSVToRegister(
        csvContent,
        currentIssuer.name,
        currentIssuer.logo
      )
      
      // Add to the shared context
      addRegister(register)
      
      // Set result for display - just confirmation, no matching yet
      setUploadResult({
        success: true,
        register_id: register.id,
        issuer: register.issuer,
        total_holders: register.totalHolders,
        total_etfs: register.etfs.length,
        etf_names: register.etfs.slice(0, 5).map(e => e.name) // Show first 5 ETF names
      })
      
      console.log('Register uploaded:', register)
    } catch (error) {
      console.error('Failed to parse CSV:', error)
      // Demo fallback
      setUploadResult({
        success: false,
        error: 'Failed to parse CSV file. Please check the format.'
      })
    }
    
    setIsUploading(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Upload Share Register</h2>
        <p className="text-gray-400">Upload your complete share register containing all ETF products</p>
      </div>

      {/* Format Explanation */}
      <div className="card-glass rounded-xl p-6 border-l-4 border-primary-500">
        <h3 className="text-lg font-semibold text-white mb-2">Expected Format</h3>
        <p className="text-gray-400 text-sm mb-4">
          Share register should be a matrix with nominee accounts as rows and ETF ISINs as columns.
          Each cell contains the number of shares held by that nominee in that ETF.
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs font-mono">
            <thead>
              <tr className="text-gray-500">
                <th className="px-3 py-1 text-left">Account Name</th>
                <th className="px-3 py-1">Account No.</th>
                <th className="px-3 py-1">IE00B4L5Y983</th>
                <th className="px-3 py-1">IE00B5BMR087</th>
                <th className="px-3 py-1">...</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr>
                <td className="px-3 py-1">EUROCLEAR BANK SA/NV</td>
                <td className="px-3 py-1">EU001234</td>
                <td className="px-3 py-1 text-right">45,000,000</td>
                <td className="px-3 py-1 text-right">28,000,000</td>
                <td className="px-3 py-1">...</td>
              </tr>
              <tr>
                <td className="px-3 py-1">BREWIN DOLPHIN NOMINEES</td>
                <td className="px-3 py-1">BD112233</td>
                <td className="px-3 py-1 text-right">8,200,000</td>
                <td className="px-3 py-1 text-right">5,400,000</td>
                <td className="px-3 py-1">...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Method Selection */}
      <div className="card-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Select Upload Method</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'manual', label: 'Manual Upload', icon: FileUp, description: 'Upload CSV/Excel file' },
            { id: 'api', label: 'API Connection', icon: LinkIcon, description: 'Connect via transfer agent' },
            { id: 'email', label: 'Email Inbox', icon: Mail, description: 'Forward to inbox' },
          ].map((method) => (
            <button
              key={method.id}
              onClick={() => setUploadMethod(method.id as typeof uploadMethod)}
              className={`p-4 rounded-xl border transition-all text-left ${
                uploadMethod === method.id
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <method.icon className={`w-6 h-6 mb-3 ${
                uploadMethod === method.id ? 'text-primary-400' : 'text-gray-400'
              }`} />
              <div className="font-medium text-white">{method.label}</div>
              <div className="text-sm text-gray-500">{method.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Upload */}
      {uploadMethod === 'manual' && (
        <div className="card-glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Upload File</h3>

          {/* Current Issuer Display */}
          <div className="mb-6 p-4 bg-dark-700/50 rounded-xl border border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Uploading for</div>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: currentIssuer.primaryColor }}
              >
                {currentIssuer.logo}
              </div>
              <div>
                <div className="font-semibold text-white">{currentIssuer.name}</div>
                <div className="text-sm text-gray-400">{currentIssuer.etfCount} ETF Products</div>
              </div>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary-500 bg-primary-500/10'
                : uploadedFile
                  ? 'border-accent-500 bg-accent-500/10'
                  : 'border-white/20 hover:border-white/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {uploadedFile ? (
              <div className="flex flex-col items-center">
                <CheckCircle className="w-12 h-12 text-accent-400 mb-4" />
                <p className="text-white font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setUploadedFile(null)
                    setUploadResult(null)
                  }}
                  className="mt-4 text-sm text-red-400 hover:text-red-300"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-500 mb-4" />
                <p className="text-white font-medium">Drag & drop your share register</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                <p className="text-xs text-gray-600 mt-4">Supports CSV, XLSX formats • All ETF products in one file</p>
              </div>
            )}
          </div>

          {/* Upload Result */}
          {uploadResult && uploadResult.success && (
            <div className="mt-6 p-4 bg-accent-500/10 border border-accent-500/20 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-accent-400" />
                <span className="font-semibold text-white">Register Uploaded Successfully!</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Your <span className="text-white font-medium">{uploadResult.issuer}</span> share register has been queued for analysis.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Nominee Accounts</div>
                  <div className="text-xl font-bold text-white">{uploadResult.total_holders}</div>
                </div>
                <div>
                  <div className="text-gray-400">ETF Products</div>
                  <div className="text-xl font-bold text-white">{uploadResult.total_etfs}</div>
                </div>
              </div>
              {uploadResult.etf_names && uploadResult.etf_names.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sample ETFs Detected</div>
                  <div className="flex flex-wrap gap-2">
                    {uploadResult.etf_names.map((name: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-dark-700 rounded text-xs text-gray-300">
                        {name}
                      </span>
                    ))}
                    {uploadResult.total_etfs > 5 && (
                      <span className="px-2 py-1 bg-dark-600 rounded text-xs text-gray-400">
                        +{uploadResult.total_etfs - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-4 p-3 bg-primary-500/10 rounded-lg border border-primary-500/20">
                <p className="text-sm text-primary-300">
                  <span className="font-medium">Next step:</span> Go to the Analysis Queue to start the matching and disclosure process.
                </p>
              </div>
            </div>
          )}
          
          {/* Upload Error */}
          {uploadResult && !uploadResult.success && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <span className="font-semibold text-white">Upload Failed</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">{uploadResult.error}</p>
            </div>
          )}
        </div>
      )}

      {/* API Connection */}
      {uploadMethod === 'api' && (
        <div className="card-glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Transfer Agent</label>
              <select className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3">
                <option>State Street</option>
                <option>BNY Mellon</option>
                <option>Northern Trust</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">API Endpoint</label>
              <input
                type="text"
                placeholder="https://api.transferagent.com/v1"
                className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">API Key</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3"
              />
            </div>
            <button className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Test Connection
            </button>
          </div>
        </div>
      )}

      {/* Email Inbox */}
      {uploadMethod === 'email' && (
        <div className="card-glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Email Inbox</h3>
          <div className="bg-dark-800 rounded-xl p-6 text-center">
            <Mail className="w-12 h-12 text-primary-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Forward share registers to:</p>
            <code className="px-4 py-2 bg-dark-900 rounded-lg text-primary-400 font-mono">
              amundi@inbox.etanalytics.com
            </code>
            <p className="text-sm text-gray-500 mt-4">
              Registers will be automatically processed and matched to your ETF products.
            </p>
          </div>
        </div>
      )}

      {/* Authorization */}
      <div className="card-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Authorization</h3>
        <div className="bg-dark-800 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-400">
            By signing this authorization, you grant Exchange Traded Analytics the right to:
          </p>
          <ul className="text-sm text-gray-400 mt-3 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" />
              <span>Access and analyze share register data on your behalf</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" />
              <span>Issue Section 1062 disclosure notices to custodians as your agent</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" />
              <span>Process and store ownership data in accordance with GDPR</span>
            </li>
          </ul>
        </div>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={authorizationSigned}
            onChange={(e) => setAuthorizationSigned(e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-white">
            I have read and agree to the authorization terms
          </span>
        </label>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <button className="btn-secondary" onClick={() => navigate('/issuer')}>Cancel</button>
        {uploadResult ? (
          <button
            onClick={() => navigate('/analysis')}
            className="btn-primary flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> View in Analysis Queue
          </button>
        ) : (
          <button
            onClick={handleUpload}
            disabled={!uploadedFile || !authorizationSigned || isUploading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Upload & Process Register
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Daily Tracking Component
const DailyTracking = () => {
  const navData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(2026, 0, 14 - i).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    nav: 98.45 - Math.random() * 2 + Math.random() * 2,
    shares: 126952000 + Math.floor(Math.random() * 2000000 - 1000000)
  })).reverse()

  const knownHolders = [
    { name: 'Hargreaves Lansdown', shares: 6800000, change: 280000, changePercent: 4.3, type: 'platform' },
    { name: 'Brewin Dolphin', shares: 8200000, change: 150000, changePercent: 1.9, type: 'wealth_manager' },
    { name: 'Interactive Investor', shares: 3800000, change: 95000, changePercent: 2.6, type: 'platform' },
    { name: 'St. James\'s Place', shares: 3200000, change: 200000, changePercent: 6.7, type: 'wealth_manager' },
    { name: 'Rathbones', shares: 4200000, change: -120000, changePercent: -2.8, type: 'wealth_manager' },
    { name: 'AJ Bell', shares: 2100000, change: -85000, changePercent: -3.9, type: 'platform' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Daily Tracking</h2>
          <p className="text-gray-400">Real-time ownership changes for known entities</p>
        </div>
        <div className="flex items-center gap-4">
          <select className="bg-dark-800 border border-white/10 rounded-lg px-4 py-2 text-sm">
            <option>Amundi MSCI World UCITS ETF</option>
            <option>Amundi S&P 500 UCITS ETF</option>
          </select>
          <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-glass rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Current NAV</div>
          <div className="text-2xl font-bold text-white">$98.45</div>
          <div className="flex items-center gap-1 text-sm text-accent-400 mt-1">
            <ArrowUpRight className="w-4 h-4" /> +0.64%
          </div>
        </div>
        <div className="card-glass rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Shares Outstanding</div>
          <div className="text-2xl font-bold text-white">126.95M</div>
          <div className="flex items-center gap-1 text-sm text-accent-400 mt-1">
            <ArrowUpRight className="w-4 h-4" /> +280K
          </div>
        </div>
        <div className="card-glass rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Net New Assets (Today)</div>
          <div className="text-2xl font-bold text-white">$45M</div>
          <div className="flex items-center gap-1 text-sm text-accent-400 mt-1">
            <TrendingUp className="w-4 h-4" /> Inflow
          </div>
        </div>
        <div className="card-glass rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Tracked Entities</div>
          <div className="text-2xl font-bold text-white">24</div>
          <div className="text-sm text-gray-500 mt-1">of 47 total holders</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">NAV Trend (30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={navData}>
                <defs>
                  <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#32a6ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#32a6ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1d24',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area type="monotone" dataKey="nav" stroke="#32a6ff" fill="url(#navGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Shares Outstanding (30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={navData}>
                <defs>
                  <linearGradient id="sharesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c56d" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c56d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1d24',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`${(value / 1e6).toFixed(2)}M`, 'Shares']}
                />
                <Area type="monotone" dataKey="shares" stroke="#22c56d" fill="url(#sharesGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Known Holders Table */}
      <div className="card-glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Known Entity Changes (Today)</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="status-dot status-online" />
            Live tracking active
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Type</th>
                <th>Current Shares</th>
                <th>Change</th>
                <th>% Change</th>
              </tr>
            </thead>
            <tbody>
              {knownHolders.map((holder, i) => (
                <tr key={i}>
                  <td className="font-medium text-white">{holder.name}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs ${getEntityTypeColor(holder.type as any)}`}>
                      {getEntityTypeLabel(holder.type as any)}
                    </span>
                  </td>
                  <td>{(holder.shares / 1e6).toFixed(2)}M</td>
                  <td className={holder.change >= 0 ? 'text-accent-400' : 'text-red-400'}>
                    {holder.change >= 0 ? '+' : ''}{(holder.change / 1e3).toFixed(0)}K
                  </td>
                  <td>
                    <div className={`flex items-center gap-1 ${holder.changePercent >= 0 ? 'text-accent-400' : 'text-red-400'}`}>
                      {holder.changePercent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {Math.abs(holder.changePercent).toFixed(1)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-400 font-medium">Pooled accounts not shown</p>
              <p className="text-sm text-gray-400 mt-1">
                23 holders representing 72% of shares are in pooled nominees requiring disclosure. 
                Schedule a full analysis for complete ownership data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reports Component - Enhanced with ETFDatabase context
const Reports = () => {
  const navigate = useNavigate()
  const { currentIssuer } = useIssuer()
  const { getReportsForIssuer } = useETFDatabase()
  const { deliveredReports: legacyReports } = useReports()
  
  // Get reports for the current issuer from the new context
  const etfDatabaseReports = getReportsForIssuer(currentIssuer.id)
  
  // Determine report quarter name based on date
  const getQuarterName = (dateStr: string): string => {
    const date = new Date(dateStr)
    const quarter = Math.ceil((date.getMonth() + 1) / 3)
    return `Q${quarter} ${date.getFullYear()}`
  }

  const formatAUM = (value: number) => {
    if (value >= 1e12) return `€${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `€${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `€${(value / 1e6).toFixed(1)}M`
    return `€${value.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Historical Reports</h2>
          <p className="text-gray-400">
            View and download ownership analysis reports for {currentIssuer.name}
          </p>
        </div>
        <Link to="/issuer/upload" className="btn-primary flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload New Register
        </Link>
      </div>

      {/* ETF Database Reports */}
      {etfDatabaseReports.length > 0 ? (
        <div className="space-y-4">
          {etfDatabaseReports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-glass rounded-xl p-6 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    index === 0 ? 'bg-accent-500/20' : 'bg-primary-500/20'
                  }`}>
                    <FileText className={`w-7 h-7 ${
                      index === 0 ? 'text-accent-400' : 'text-primary-400'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">
                        {getQuarterName(report.registerDate)} Share Register Analysis
                      </h3>
                      {index === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-accent-500/20 text-accent-400">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Delivered: {new Date(report.deliveredAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Register Date: {new Date(report.registerDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-xl font-bold text-white">{report.totalETFs}</div>
                      <div className="text-xs text-gray-500">ETFs</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white">{report.totalShareClasses}</div>
                      <div className="text-xs text-gray-500">Share Classes</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white">{report.totalHolders}</div>
                      <div className="text-xs text-gray-500">Nominees</div>
                    </div>
                  </div>
                  
                  {/* Identified Progress */}
                  <div className="text-center px-6 border-l border-white/10">
                    <div className="text-2xl font-bold text-accent-400">{report.identifiedPct.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">Identified</div>
                    <div className="w-20 h-2 bg-dark-700 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                        style={{ width: `${Math.min(report.identifiedPct, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => navigate(`/issuer/reports/${report.id}`)}
                      className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
                    >
                      <Eye className="w-4 h-4" /> View Report
                    </button>
                    <button className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
                      <Download className="w-4 h-4" /> Export Excel
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Ownership Breakdown (if available) */}
              {report.ownershipBreakdown && report.ownershipBreakdown.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-4 flex-wrap">
                    {report.ownershipBreakdown.slice(0, 6).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-gray-500">{item.type}</span>
                        <span className="text-xs font-medium text-white">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        // No reports yet - show empty state
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass rounded-xl p-12 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Reports Yet</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Upload your first share register to begin the ownership analysis process. 
            Our team will analyze your register and deliver a comprehensive report.
          </p>
          <Link to="/issuer/upload" className="btn-primary inline-flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload Share Register
          </Link>
        </motion.div>
      )}

      {/* Legacy Delivered Reports (from old context) - show if any exist */}
      {legacyReports.length > 0 && (
        <div className="card-glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-accent-400" />
            Recently Delivered
          </h3>
          <div className="space-y-3">
            {legacyReports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl border border-accent-500/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-accent-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Full Share Register Analysis</div>
                    <div className="text-sm text-gray-400">
                      {report.etfProducts.length} ETF Products • Delivered {new Date(report.deliveredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-accent-400">{report.identifiedPct.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">Identified</div>
                  </div>
                  <button 
                    onClick={() => navigate(`/issuer/reports/${report.id}`)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <PieChartIcon className="w-4 h-4" /> View Report
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Report Detail Component - uses workflow data with tree traversal for accurate identified %
const ReportDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { deliveredReports } = useReports()
  const { getRegistersForIssuer } = useRegisters()
  const [selectedETF, setSelectedETF] = useState<string | null>(null)
  
  // Try to load workflow data from localStorage for accurate tree traversal
  const workflow = useMemo(() => {
    try {
      const saved = localStorage.getItem('etanalytics_workflows')
      if (saved) {
        const workflows = JSON.parse(saved)
        // Find workflow matching this report/register ID
        return workflows[id] as WorkflowState | undefined
      }
    } catch (e) {
      console.error('Failed to load workflow:', e)
    }
    return undefined
  }, [id])
  
  // Build report dynamically from workflow data using tree traversal
  const report = useMemo(() => {
    // Try to get base report from context
    const baseReport = deliveredReports.find(r => r.id === id) || sampleDeliveredReport
    
    // If no workflow data at all, return base report
    if (!workflow) return baseReport
    
    // If workflow has etfData but no nominees, use etfData directly
    if (!workflow.nominees && workflow.etfData) {
      // Build report from etfData
      const identifiedPct = workflow.identifiedPct || 0
      const etfProducts = workflow.etfData.map(etf => ({
        isin: etf.isin,
        name: etf.name,
        identifiedPct: etf.identifiedPct || identifiedPct,
        totalShares: etf.totalShares,
        identifiedShares: etf.identifiedShares || Math.floor(etf.totalShares * identifiedPct / 100),
        topHolders: etf.clients?.map(c => ({ name: c.name, shares: c.shares, pct: c.pct })) || []
      }))
      
      // Aggregate top holders across all ETFs
      const holderMap = new Map<string, { name: string; shares: number }>()
      workflow.etfData.forEach(etf => {
        etf.clients?.forEach(client => {
          const existing = holderMap.get(client.name) || { name: client.name, shares: 0 }
          existing.shares += client.shares
          holderMap.set(client.name, existing)
        })
      })
      
      const totalShares = workflow.etfData.reduce((sum, etf) => sum + etf.totalShares, 0)
      const topHolders = Array.from(holderMap.values())
        .sort((a, b) => b.shares - a.shares)
        .slice(0, 20)
        .map(h => ({ ...h, type: 'Decision Maker', pct: totalShares > 0 ? (h.shares / totalShares) * 100 : 0 }))
      
      return {
        ...baseReport,
        id: id || baseReport.id,
        identifiedPct: Math.round(identifiedPct * 10) / 10,
        etfProducts,
        topHolders,
        ownershipBreakdown: [
          { type: 'Identified', pct: identifiedPct, color: '#6366f1' },
          { type: 'Unidentified', pct: 100 - identifiedPct, color: '#475569' }
        ]
      }
    }
    
    // If no nominees at all, use workflow's identifiedPct
    if (!workflow.nominees) {
      return {
        ...baseReport,
        id: id || baseReport.id,
        identifiedPct: workflow.identifiedPct || baseReport.identifiedPct
      }
    }
    
    // Collect ALL decision makers using tree traversal
    const allDecisionMakers: Map<string, { name: string; type: string; shares: number }> = new Map()
    let totalIdentifiedShares = 0
    let totalShares = 0
    
    workflow.nominees.forEach(nominee => {
      const nomineeTotal = Object.values(nominee.holdings || {}).reduce((sum, s) => sum + s, 0)
      totalShares += nomineeTotal
      
      // Check if nominee is directly a decision maker
      const nomineeType = nominee.type?.toLowerCase() || ''
      const isDirectDM = DECISION_MAKER_TYPES.some(t => nomineeType === t.toLowerCase())
      
      if (isDirectDM) {
        const existing = allDecisionMakers.get(nominee.name)
        if (existing) {
          existing.shares += nomineeTotal
        } else {
          allDecisionMakers.set(nominee.name, { name: nominee.name, type: nominee.type || 'unknown', shares: nomineeTotal })
        }
        totalIdentifiedShares += nomineeTotal
      } else if (nominee.tree) {
        // Traverse tree to find terminal decision makers
        const dms = collectTerminalDMs(nominee.tree as any)
        dms.forEach(dm => {
          const existing = allDecisionMakers.get(dm.name)
          if (existing) {
            existing.shares += dm.shares
          } else {
            allDecisionMakers.set(dm.name, dm)
          }
          totalIdentifiedShares += dm.shares
        })
      }
    })
    
    // Build top holders from collected decision makers
    const topHolders = Array.from(allDecisionMakers.values())
      .sort((a, b) => b.shares - a.shares)
      .slice(0, 20)
      .map(h => ({ ...h, pct: totalShares > 0 ? (h.shares / totalShares) * 100 : 0 }))
    
    // Build ownership breakdown by entity type
    const breakdownByType: Map<string, number> = new Map()
    allDecisionMakers.forEach(dm => {
      const typeLabel = getEntityTypeLabel(dm.type)
      const existing = breakdownByType.get(typeLabel) || 0
      breakdownByType.set(typeLabel, existing + dm.shares)
    })
    
    // Add unidentified
    const unidentifiedShares = totalShares - totalIdentifiedShares
    if (unidentifiedShares > 0) {
      breakdownByType.set('Unidentified', unidentifiedShares)
    }
    
    const ownershipBreakdown = Array.from(breakdownByType.entries())
      .map(([type, shares], idx) => ({
        type,
        pct: totalShares > 0 ? (shares / totalShares) * 100 : 0,
        color: type === 'Unidentified' ? '#475569' : ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#a855f7'][idx % 8]
      }))
      .sort((a, b) => b.pct - a.pct)
    
    // USE WORKFLOW's identifiedPct as the source of truth (same as shown in queue)
    // Don't recalculate - use the pre-calculated value for consistency
    const identifiedPct = workflow.identifiedPct || (totalShares > 0 ? (totalIdentifiedShares / totalShares) * 100 : 0)
    
    // Adjust ownership breakdown to match workflow.identifiedPct
    const adjustedOwnershipBreakdown = [
      ...ownershipBreakdown.filter(o => o.type !== 'Unidentified'),
    ]
    // Recalculate unidentified to match workflow.identifiedPct
    const identifiedPctFromBreakdown = adjustedOwnershipBreakdown.reduce((sum, o) => sum + o.pct, 0)
    if (identifiedPct < 100) {
      adjustedOwnershipBreakdown.push({
        type: 'Unidentified',
        pct: 100 - identifiedPct,
        color: '#475569'
      })
    }
    // Normalize to ensure total = 100%
    const totalPct = adjustedOwnershipBreakdown.reduce((sum, o) => sum + o.pct, 0)
    if (totalPct > 0 && Math.abs(totalPct - 100) > 0.1) {
      const factor = 100 / totalPct
      adjustedOwnershipBreakdown.forEach(o => { o.pct *= factor })
    }
    
    // Build ETF-level data from workflow
    const etfProducts = workflow.etfData?.map(etf => ({
      isin: etf.isin,
      name: etf.name,
      totalShares: etf.totalShares,
      identifiedPct: etf.identifiedPct || workflow.identifiedPct,
      topHolders: etf.clients?.map(c => ({ name: c.name, shares: c.shares, pct: c.pct, type: 'Wealth Manager' })) || []
    })) || baseReport.etfProducts
    
    return {
      ...baseReport,
      id: id || baseReport.id,
      identifiedPct: Math.round(identifiedPct * 10) / 10,
      etfProducts,
      ownershipBreakdown: adjustedOwnershipBreakdown.sort((a, b) => b.pct - a.pct),
      topHolders,
      totalHolders: workflow.totalCount || baseReport.totalHolders,
      matchedHolders: workflow.matchedCount || baseReport.matchedHolders
    }
  }, [id, workflow, deliveredReports])
  
  // Calculate totals
  const totalShares = report.etfProducts.reduce((sum, e) => sum + e.totalShares, 0)
  
  // Colors for pie chart
  const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#475569']
  
  // Get top 10 holders - use report.topHolders if available, otherwise aggregate from ETFs
  const top10Holders = useMemo(() => {
    if (report.topHolders && report.topHolders.length > 0) {
      return report.topHolders.slice(0, 10).map((h, i) => ({ ...h, rank: i + 1, etf: 'All' }))
    }
    
    // Fallback: aggregate from ETF products
    const allHolders: { name: string; shares: number; type: string; etf: string }[] = []
    report.etfProducts.forEach(etf => {
      (etf.topHolders || []).forEach(holder => {
        allHolders.push({ ...holder, etf: etf.name })
      })
    })
    
    const aggregated = allHolders.reduce((acc, holder) => {
      const existing = acc.find(h => h.name === holder.name)
      if (existing) {
        existing.shares += holder.shares
      } else {
        acc.push({ ...holder })
      }
      return acc
    }, [] as typeof allHolders)
    
    return aggregated
      .sort((a, b) => b.shares - a.shares)
      .slice(0, 10)
      .map((h, i) => ({ ...h, rank: i + 1, pct: (h.shares / totalShares) * 100 }))
  }, [report, totalShares])
  
  // Export to Excel (simulated)
  const exportToExcel = () => {
    // Create CSV content
    let csvContent = "ETF ISIN,ETF Name,Holder Name,Holder Type,Shares,Percentage\n"
    
    report.etfProducts.forEach(etf => {
      etf.topHolders.forEach(holder => {
        csvContent += `${etf.isin},${etf.name},${holder.name},${holder.type},${holder.shares},${holder.pct}%\n`
      })
      // Add unidentified row
      const unidentifiedShares = etf.totalShares - etf.topHolders.reduce((sum, h) => sum + h.shares, 0)
      const unidentifiedPct = (unidentifiedShares / etf.totalShares) * 100
      csvContent += `${etf.isin},${etf.name},Unidentified,Pooled/Layered Custody,${unidentifiedShares},${unidentifiedPct.toFixed(1)}%\n`
    })
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ownership_analysis_${report.id}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate('/issuer/reports')}
            className="text-sm text-gray-400 hover:text-white mb-2 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h2 className="text-2xl font-bold text-white">Ownership Analysis Report</h2>
          <p className="text-gray-400">
            Delivered {new Date(report.deliveredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} • {report.etfProducts.length} ETF Products
          </p>
        </div>
        <button 
          onClick={exportToExcel}
          className="btn-primary flex items-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" /> Export to Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card-glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-accent-400" />
            </div>
            <span className="text-gray-400">Identified</span>
          </div>
          <div className="text-3xl font-bold text-accent-400">{report.identifiedPct.toFixed(1)}%</div>
        </div>
        <div className="card-glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-400" />
            </div>
            <span className="text-gray-400">Holders Matched</span>
          </div>
          <div className="text-3xl font-bold text-white">{report.matchedHolders}/{report.totalHolders}</div>
        </div>
        <div className="card-glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-gray-400">ETF Products</span>
          </div>
          <div className="text-3xl font-bold text-white">{report.etfProducts.length}</div>
        </div>
        <div className="card-glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-gray-400">Total Shares</span>
          </div>
          <div className="text-3xl font-bold text-white">{(totalShares / 1e6).toFixed(0)}M</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ownership Breakdown Pie Chart */}
        <div className="card-glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Ownership Breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={report.ownershipBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="pct"
                  nameKey="type"
                  label={({ type, pct }) => `${pct.toFixed(0)}%`}
                  labelLine={false}
                >
                  {report.ownershipBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-dark-900 border border-white/10 rounded-lg px-3 py-2">
                          <div className="text-white font-medium">{data.type}</div>
                          <div className="text-gray-400">{data.pct.toFixed(1)}%</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend 
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ETF Identified Rates Bar Chart */}
        <div className="card-glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Identified Rate by ETF</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={report.etfProducts.map(e => ({ name: e.name.split(' ').slice(0, 3).join(' '), identified: e.identifiedPct, unidentified: 100 - e.identifiedPct }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af' }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af' }} width={80} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-dark-900 border border-white/10 rounded-lg px-3 py-2">
                          <div className="text-white font-medium">{label}</div>
                          <div className="text-accent-400">{payload[0].value?.toFixed(1)}% identified</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="identified" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="unidentified" stackId="a" fill="#475569" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 10 Holdings */}
      <div className="card-glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Top 10 Holdings (All ETFs Combined)</h3>
          <button 
            onClick={exportToExcel}
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            <Download className="w-4 h-4" /> Export All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Holder Name</th>
                <th>Type</th>
                <th>Total Shares</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {top10Holders.map((holder) => (
                <tr key={holder.rank}>
                  <td>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      holder.rank <= 3 ? 'bg-accent-500/20 text-accent-400' : 'bg-dark-700 text-gray-400'
                    }`}>
                      {holder.rank}
                    </span>
                  </td>
                  <td className="font-medium text-white">{holder.name}</td>
                  <td>
                    <span className="px-2 py-1 rounded-full text-xs bg-dark-700 text-gray-300">
                      {holder.type}
                    </span>
                  </td>
                  <td>{(holder.shares / 1e6).toFixed(2)}M</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                          style={{ width: `${Math.min(holder.pct * 5, 100)}%` }}
                        />
                      </div>
                      <span className="text-accent-400 font-medium">{holder.pct.toFixed(2)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ETF-by-ETF Breakdown */}
      <div className="card-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">ETF-by-ETF Breakdown</h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          <button 
            onClick={() => setSelectedETF(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedETF === null ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'
            }`}
          >
            All Products
          </button>
          {report.etfProducts.map((etf) => (
            <button
              key={etf.isin}
              onClick={() => setSelectedETF(etf.isin)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedETF === etf.isin ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'
              }`}
            >
              {etf.name.split(' ')[0]}
            </button>
          ))}
        </div>
        
        <div className="space-y-4">
          {report.etfProducts
            .filter(etf => selectedETF === null || etf.isin === selectedETF)
            .map((etf) => (
              <div key={etf.isin} className="bg-dark-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-white">{etf.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{etf.isin}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-white">{(etf.totalShares / 1e6).toFixed(1)}M shares</div>
                      <div className="text-xs text-accent-400">{etf.identifiedPct.toFixed(1)}% identified</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {etf.topHolders.slice(0, 5).map((holder, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-4">{idx + 1}</span>
                        <span className="text-sm text-white">{holder.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-dark-700 rounded text-gray-400">{holder.type}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">{(holder.shares / 1e6).toFixed(2)}M</span>
                        <span className="text-sm text-accent-400 font-medium w-16 text-right">{holder.pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// Registers Tab Component - Historical Raw Registers
const RegistersTab = () => {
  const { currentIssuer } = useIssuer()
  const { getRegistersForIssuer, uploadedRegisters } = useRegisters()
  const navigate = useNavigate()
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'delivered'>('all')
  const [expandedRegisters, setExpandedRegisters] = useState<Set<string>>(new Set())
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  
  // Get registers for this issuer
  const allRegisters = getRegistersForIssuer(currentIssuer.id)
  
  // Debug logging
  console.log('RegistersTab Debug:', {
    currentIssuerId: currentIssuer.id,
    allRegistersCount: allRegisters.length,
    totalRegistersInContext: uploadedRegisters.length,
    issuerIds: [...new Set(uploadedRegisters.map(r => r.issuerId))]
  })
  
  // Filter by status
  const filteredRegisters = allRegisters.filter(reg => {
    if (statusFilter === 'all') return true
    return reg.status === statusFilter
  })
  
  // Sort by date
  const sortedRegisters = [...filteredRegisters].sort((a, b) => {
    const dateA = new Date(a.uploadDate).getTime()
    const dateB = new Date(b.uploadDate).getTime()
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
  })
  
  const toggleExpand = (id: string) => {
    setExpandedRegisters(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Pending Analysis</span>
      case 'in_progress':
        return <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">In Progress</span>
      case 'analyzed':
        return <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">Analyzed</span>
      case 'delivered':
        return <span className="px-2 py-1 rounded-full text-xs bg-accent-500/20 text-accent-400">Delivered</span>
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">{status}</span>
    }
  }
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }
  
  const downloadRegister = (register: any) => {
    // Generate CSV content from register data
    let csvContent = 'Account Name,Account Number'
    const isins = register.etfs.map((e: any) => e.isin)
    csvContent += ',' + isins.join(',') + '\n'
    
    register.nominees.forEach((nom: any) => {
      const row = [nom.name, nom.accountNumber || '']
      isins.forEach((isin: string) => {
        row.push(nom.holdings[isin]?.toString() || '0')
      })
      csvContent += row.join(',') + '\n'
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = register.fileName
    link.click()
  }
  
  // Stats
  const pendingCount = allRegisters.filter(r => r.status === 'pending').length
  const deliveredCount = allRegisters.filter(r => r.status === 'delivered').length
  const inProgressCount = allRegisters.filter(r => r.status === 'in_progress').length
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Share Registers</h2>
          <p className="text-gray-400">
            Historical raw share registers for {currentIssuer.name}
          </p>
        </div>
        <Link to="/issuer/upload" className="btn-primary flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload New Register
        </Link>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass rounded-xl p-4"
        >
          <div className="text-2xl font-bold text-white">{allRegisters.length}</div>
          <div className="text-sm text-gray-500">Total Registers</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-glass rounded-xl p-4"
        >
          <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
          <div className="text-sm text-gray-500">Pending Analysis</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-glass rounded-xl p-4"
        >
          <div className="text-2xl font-bold text-blue-400">{inProgressCount}</div>
          <div className="text-sm text-gray-500">In Progress</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-glass rounded-xl p-4"
        >
          <div className="text-2xl font-bold text-accent-400">{deliveredCount}</div>
          <div className="text-sm text-gray-500">Delivered</div>
        </motion.div>
      </div>
      
      {/* Filters */}
      <div className="card-glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">Status:</span>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'delivered', label: 'Delivered' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    statusFilter === option.value
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-dark-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Registers Table */}
      {sortedRegisters.length > 0 ? (
        <div className="card-glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800/50">
              <tr>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Upload Date</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-6 py-4">File Name</th>
                <th className="text-center text-xs text-gray-500 uppercase tracking-wider px-6 py-4">ETFs</th>
                <th className="text-center text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Nominees</th>
                <th className="text-center text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-center text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Identified</th>
                <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedRegisters.map((register) => {
                const isExpanded = expandedRegisters.has(register.id)
                
                return (
                  <React.Fragment key={register.id}>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleExpand(register.id)}
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          <div>
                            <div className="text-sm font-medium text-white">{formatDate(register.uploadDate)}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(register.uploadDate).toLocaleDateString('en-GB', { weekday: 'short' })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-primary-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{register.fileName}</div>
                            <div className="text-xs text-gray-500">{register.issuerName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-white">{register.etfs.length}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-white">{register.totalHolders}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(register.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {register.identifiedPct !== undefined ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-dark-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                                style={{ width: `${Math.min(register.identifiedPct, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-accent-400">{register.identifiedPct.toFixed(1)}%</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => downloadRegister(register)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            title="Download CSV"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {register.status === 'pending' && (
                            <button
                              onClick={() => navigate('/analysis')}
                              className="px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded-lg text-xs font-medium hover:bg-primary-500/30 transition-colors"
                            >
                              Request Analysis
                            </button>
                          )}
                          {register.status === 'delivered' && (
                            <button
                              onClick={() => navigate(`/issuer/reports/${register.id}`)}
                              className="px-3 py-1.5 bg-accent-500/20 text-accent-400 rounded-lg text-xs font-medium hover:bg-accent-500/30 transition-colors"
                            >
                              View Report
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded ETF Preview */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-0">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="py-4 pl-8"
                            >
                              <div className="bg-dark-800/50 rounded-xl p-4">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">ETF Products in Register</div>
                                <div className="grid grid-cols-3 gap-3">
                                  {register.etfs.map((etf: any) => (
                                    <div key={etf.isin} className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
                                      <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                                        <Layers className="w-4 h-4 text-primary-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">{etf.name}</div>
                                        <div className="text-xs text-gray-500">{etf.isin}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-medium text-white">
                                          {(etf.totalShares / 1e6).toFixed(1)}M
                                        </div>
                                        <div className="text-xs text-gray-500">shares</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Top Nominees Preview */}
                                <div className="mt-4 pt-4 border-t border-white/5">
                                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Top Nominees (by total shares)</div>
                                  <div className="space-y-2">
                                    {register.nominees
                                      .slice()
                                      .sort((a: any, b: any) => b.totalShares - a.totalShares)
                                      .slice(0, 5)
                                      .map((nom: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-dark-700/30 rounded-lg">
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-dark-600 flex items-center justify-center text-xs text-gray-400">
                                              {idx + 1}
                                            </div>
                                            <span className="text-sm text-white">{nom.name}</span>
                                            {nom.accountNumber && (
                                              <span className="text-xs text-gray-500">({nom.accountNumber})</span>
                                            )}
                                          </div>
                                          <span className="text-sm text-gray-400">
                                            {(nom.totalShares / 1e6).toFixed(2)}M shares
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass rounded-xl p-12 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Registers Found</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {statusFilter !== 'all' 
              ? `No registers with status "${statusFilter}" found for ${currentIssuer.name}.`
              : `No share registers have been uploaded for ${currentIssuer.name} yet.`
            }
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/issuer/upload" className="btn-primary inline-flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Share Register
            </Link>
            <button
              onClick={() => {
                // Force reinitialize historical data
                const { initializeWithHistoricalData } = require('../store/historicalData')
                initializeWithHistoricalData()
                window.location.reload()
              }}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Load Demo Data
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Debug: Issuer ID = {currentIssuer.id}, Total registers in system = {uploadedRegisters.length}
          </p>
        </motion.div>
      )}
    </div>
  )
}

// Settings Component
const IssuerSettings = () => {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="card-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Analysis Frequency</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-dark-800 rounded-lg cursor-pointer">
            <div>
              <div className="font-medium text-white">Quarterly Analysis</div>
              <div className="text-sm text-gray-500">Full disclosure process every 3 months</div>
            </div>
            <input type="radio" name="frequency" defaultChecked className="w-4 h-4 text-primary-500" />
          </label>
          <label className="flex items-center justify-between p-4 bg-dark-800 rounded-lg cursor-pointer">
            <div>
              <div className="font-medium text-white">Monthly Analysis</div>
              <div className="text-sm text-gray-500">Full disclosure process every month</div>
            </div>
            <input type="radio" name="frequency" className="w-4 h-4 text-primary-500" />
          </label>
        </div>
      </div>

      <div className="card-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
        <div className="space-y-4">
          {[
            { label: 'Email alerts for large position changes', checked: true },
            { label: 'Weekly summary reports', checked: true },
            { label: 'Analysis completion notifications', checked: true },
            { label: 'Disclosure response alerts', checked: false },
          ].map((item, i) => (
            <label key={i} className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-300">{item.label}</span>
              <input type="checkbox" defaultChecked={item.checked} className="w-4 h-4 text-primary-500 rounded" />
            </label>
          ))}
        </div>
      </div>

      <div className="card-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Current Plan</h3>
        <div className="flex items-center justify-between p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
          <div>
            <div className="font-medium text-white">Professional Plan</div>
            <div className="text-sm text-gray-400">Up to 50 ETF products • Monthly analysis</div>
          </div>
          <button className="btn-secondary text-sm py-2 px-4">Upgrade</button>
        </div>
      </div>
    </div>
  )
}

export default IssuerDashboard

