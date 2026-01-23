import { useState, useEffect, createContext, useContext, useMemo } from 'react'
import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  Database,
  Users,
  FileText,
  Settings,
  Bell,
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  Pause,
  ArrowRight,
  X,
  Edit,
  Trash2,
  Building2,
  Layers,
  Target,
  Filter,
  RefreshCw,
  Send,
  Download,
  Upload,
  ExternalLink,
  MoreVertical,
  BarChart3,
  Mail,
  Building,
  Maximize2,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { OwnershipTree, TreeNodeData } from '../components/OwnershipTree'
import { MobileNav } from '../components/MobileNav'
import DemoDisclaimerModal from '../components/DemoDisclaimerModal'
import { 
  sampleIssuers, 
  sampleETFs, 
  sampleShareRegister, 
  knownEntities,
  getEntityTypeColor,
  getEntityTypeLabel
} from '../store/data'
import { EntityType, ShareRegisterEntry, KnownEntity } from '../types'
import { useRegisters, UploadedRegister } from '../store/RegisterContext'
import { generateHistoricalWorkflows, WorkflowState as HistoricalWorkflowState, ResolvedNominee, TreeNode as HistoricalTreeNode, collectTerminalDMs, DECISION_MAKER_TYPES } from '../store/historicalData'
import { useETFDatabase, ETFProduct, ShareClass, NAVRecord } from '../store/ETFDatabaseContext'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

// Tree node for custody chain - represents an entity at any level
interface TreeNode {
  id: string
  name: string
  type: string
  level: number
  holdings: Record<string, number>  // shares per ETF at this node
  isTerminal: boolean  // true if this is an investment decision maker
  children: TreeNode[]  // child nodes (next level down)
}

// Legacy custody chain level (kept for backwards compatibility during matching)
interface CustodyLevel {
  level: number
  name: string
  type: string
  resolved: boolean
}

// Nominee type for workflow
interface NomineeState {
  id: string
  name: string
  accountNumber: string
  type?: string  // Entity type for display (e.g., 'wealth_manager', 'global_custodian')
  status: string
  level: number
  confidence: number
  totalShares: number
  holdings: Record<string, number>
  custodyChain: CustodyLevel[]  // used during matching phase
  tree?: TreeNode  // the visual tree structure built during disclosure
}

// ETF data type for workflow
interface ETFDataState {
  isin: string
  name: string
  totalShares: number
  identifiedPct: number
  clients: { name: string; shares: number; pct: number }[]
}

// Workflow state types
interface WorkflowState {
  registerId: string
  phase: 'idle' | 'loading' | 'matching' | 'disclosure' | 'delivered'
  progress: number // 0-100
  matchedCount: number
  totalCount: number
  identifiedPct: number
  nominees?: NomineeState[]
  etfData?: ETFDataState[]
}

// Create context for workflow state
interface WorkflowContextType {
  workflows: Record<string, WorkflowState>
  updateWorkflow: (id: string, state: Partial<WorkflowState>) => void
  activeWorkflowId: string | null
  setActiveWorkflowId: (id: string | null) => void
}

const WorkflowContext = createContext<WorkflowContextType | null>(null)

const useWorkflow = () => {
  const context = useContext(WorkflowContext)
  if (!context) throw new Error('useWorkflow must be used within WorkflowProvider')
  return context
}

// Visual Tree Node Component - renders a single node with Add Child/Sibling buttons
interface TreeNodeViewProps {
  node: TreeNode
  parentHoldings: Record<string, number>  // holdings from parent to calculate remaining
  siblingHoldings: Record<string, number>  // sum of sibling holdings at this level
  etfProducts: { isin: string; name: string; totalShares: number }[]
  onAddChild: (parentId: string) => void
  onAddSibling: (nodeId: string, parentId: string | null) => void
  onDelete: (nodeId: string) => void
  onMarkTerminal: (nodeId: string) => void
  parentId: string | null
  isLastSibling: boolean
}

const TreeNodeView = ({ 
  node, 
  parentHoldings, 
  siblingHoldings,
  etfProducts, 
  onAddChild, 
  onAddSibling, 
  onDelete,
  onMarkTerminal,
  parentId,
  isLastSibling
}: TreeNodeViewProps) => {
  const [showHoldings, setShowHoldings] = useState(false)
  
  // Calculate remaining shares at this level (parent - all siblings including this node)
  const getRemainingForSibling = (isin: string) => {
    const parentShares = parentHoldings[isin] || 0
    const usedByAllSiblings = siblingHoldings[isin] || 0
    return Math.max(parentShares - usedByAllSiblings, 0)
  }
  
  // Check if any shares remain for adding a sibling
  const canAddSibling = etfProducts.some(etf => getRemainingForSibling(etf.isin) > 0)
  
  // Calculate sum of children's holdings
  const childrenHoldings = node.children.reduce((acc, child) => {
    etfProducts.forEach(etf => {
      acc[etf.isin] = (acc[etf.isin] || 0) + (child.holdings[etf.isin] || 0)
    })
    return acc
  }, {} as Record<string, number>)
  
  return (
    <div className="relative">
      {/* Node Box */}
      <div className={`relative rounded-lg border ${node.isTerminal ? 'bg-accent-500/10 border-accent-500/30' : 'bg-dark-700/50 border-white/10'}`}>
        {/* Node Header */}
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${node.isTerminal ? 'bg-accent-500' : 'bg-primary-500'}`}>
                {node.isTerminal ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-sm text-white font-bold">L{node.level}</span>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{node.name}</div>
                <div className="text-xs text-gray-500">{node.type}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHoldings(!showHoldings)}
                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/5"
              >
                {showHoldings ? 'Hide' : 'Show'} Holdings
              </button>
              {!node.isTerminal && (
                <button
                  onClick={() => onMarkTerminal(node.id)}
                  className="text-xs bg-accent-500/20 text-accent-400 px-2 py-1 rounded hover:bg-accent-500/30"
                >
                  Mark Complete
                </button>
              )}
              <button
                onClick={() => onDelete(node.id)}
                className="p-1 text-red-400 hover:bg-red-500/20 rounded"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          {/* Holdings Grid - expandable */}
          {showHoldings && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="grid grid-cols-5 gap-2 text-center">
                {etfProducts.map(etf => (
                  <div key={etf.isin}>
                    <div className="text-xs text-gray-500">{etf.isin.slice(-4)}</div>
                    <div className="text-sm text-white font-medium">
                      {((node.holdings[etf.isin] || 0) / 1e6).toFixed(2)}M
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        {!node.isTerminal && (
          <div className="px-3 pb-3 flex items-center gap-2">
            <button
              onClick={() => onAddChild(node.id)}
              className="flex-1 text-xs bg-primary-500/20 text-primary-400 px-3 py-2 rounded hover:bg-primary-500/30 transition-colors flex items-center justify-center gap-1"
            >
              <ChevronDown className="w-3 h-3" /> Add Child
            </button>
          </div>
        )}
      </div>
      
      {/* Add Sibling Button - shows to the right */}
      {canAddSibling && isLastSibling && (
        <button
          onClick={() => onAddSibling(node.id, parentId)}
          className="absolute -right-28 top-1/2 -translate-y-1/2 text-xs bg-purple-500/20 text-purple-400 px-3 py-2 rounded hover:bg-purple-500/30 transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          <Plus className="w-3 h-3" /> Add Sibling
        </button>
      )}
      
      {/* Children */}
      {node.children.length > 0 && (
        <div className="mt-4 ml-8 pl-4 border-l-2 border-primary-500/30 space-y-3">
          {/* Remaining shares indicator */}
          <div className="bg-dark-700/30 rounded p-2 mb-2">
            <div className="text-xs text-gray-500 mb-1">Remaining to allocate:</div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {etfProducts.map(etf => {
                const remaining = (node.holdings[etf.isin] || 0) - (childrenHoldings[etf.isin] || 0)
                const isFullyAllocated = remaining < 1000
                return (
                  <div key={etf.isin}>
                    <div className="text-xs text-gray-500">{etf.isin.slice(-4)}</div>
                    <div className={`text-xs font-medium ${isFullyAllocated ? 'text-accent-400' : 'text-yellow-400'}`}>
                      {isFullyAllocated ? '✓' : (remaining / 1e6).toFixed(2) + 'M'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Child nodes */}
          {node.children.map((child, idx) => (
            <TreeNodeView
              key={child.id}
              node={child}
              parentHoldings={node.holdings}
              siblingHoldings={childrenHoldings}
              etfProducts={etfProducts}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              onDelete={onDelete}
              onMarkTerminal={onMarkTerminal}
              parentId={node.id}
              isLastSibling={idx === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const WORKFLOWS_STORAGE_KEY = 'etanalytics_workflows'

/**
 * Calculate the TRUE identified percentage by traversing custody trees
 * Only counts shares attributed to DECISION_MAKER_TYPES (terminal entities)
 * Does NOT count shares held by intermediaries (custodians, CSDs, etc.)
 */
// Use workflow.identifiedPct directly as source of truth - don't recalculate
// This ensures consistency between Workflows tab, Queue, and Reports
function calculateTrueIdentifiedPct(workflow: WorkflowState | HistoricalWorkflowState | undefined): number {
  return workflow?.identifiedPct || 0
}

const AnalysisDashboard = () => {
  const location = useLocation()
  const [notifications] = useState(5)
  const { uploadedRegisters } = useRegisters()
  
  // Shared workflow state - load from localStorage or generate from historical data
  const [workflows, setWorkflows] = useState<Record<string, WorkflowState>>(() => {
    try {
      const saved = localStorage.getItem(WORKFLOWS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Object.keys(parsed).length > 0) {
          // Migrate old data format: discoveredPct -> identifiedPct
          const migrated: Record<string, WorkflowState> = {}
          Object.entries(parsed).forEach(([key, workflow]: [string, any]) => {
            migrated[key] = {
              ...workflow,
              identifiedPct: workflow.identifiedPct ?? workflow.discoveredPct ?? 0,
              etfData: workflow.etfData?.map((etf: any) => ({
                ...etf,
                identifiedPct: etf.identifiedPct ?? etf.discoveredPct ?? 0,
                identifiedShares: etf.identifiedShares ?? etf.discoveredShares ?? 0
              }))
            }
          })
          // Save migrated data
          localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(migrated))
          return migrated
        }
      }
    } catch (e) {
      console.error('Failed to load workflows from localStorage:', e)
    }
    return {}
  })
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null)
  
  // Initialize workflows from historical data if empty OR if data seems incomplete
  useEffect(() => {
    const needsRegeneration = () => {
      // Check if workflows need to be regenerated
      if (Object.keys(workflows).length === 0) return true
      
      // Check if any workflow is missing etfData or has incomplete data
      for (const workflow of Object.values(workflows)) {
        if (!workflow.etfData || workflow.etfData.length === 0) return true
        // Check if etfData is missing identifiedPct or clients
        for (const etf of workflow.etfData) {
          if (etf.identifiedPct === undefined || etf.identifiedPct === 0 || !etf.clients || etf.clients.length === 0) {
            return true
          }
        }
      }
      return false
    }
    
    if (needsRegeneration() && uploadedRegisters.length > 0) {
      console.log('Regenerating workflows - data incomplete or missing')
      const historicalWorkflows = generateHistoricalWorkflows(uploadedRegisters)
      setWorkflows(historicalWorkflows)
      try {
        localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(historicalWorkflows))
      } catch (e) {
        console.warn('Could not save workflows to localStorage:', e)
      }
    }
  }, [uploadedRegisters])
  
  // Persist workflows to localStorage
  useEffect(() => {
    if (Object.keys(workflows).length > 0) {
      try {
        localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(workflows))
      } catch (e) {
        console.warn('Could not save workflows to localStorage:', e)
      }
    }
  }, [workflows])
  
  const updateWorkflow = (id: string, state: Partial<WorkflowState>) => {
    setWorkflows(prev => {
      const updated = {
        ...prev,
        [id]: { ...prev[id], ...state }
      }
      localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }
  
  const workflowContextValue: WorkflowContextType = {
    workflows,
    updateWorkflow,
    activeWorkflowId,
    setActiveWorkflowId
  }

  const navItems = [
    { path: '/analysis', icon: Layers, label: 'Queue', exact: true },
    { path: '/analysis/clients', icon: Building2, label: 'Clients' },
    { path: '/analysis/entities', icon: Database, label: 'Entity Database' },
    { path: '/analysis/etfs', icon: BarChart3, label: 'ETF Database' },
    { path: '/analysis/workflows', icon: Target, label: 'Workflows' },
    { path: '/analysis/settings', icon: Settings, label: 'Settings' },
  ]

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <>
      {/* Demo Disclaimer Modal */}
      <DemoDisclaimerModal />
      
      <div className="min-h-screen bg-dark-950 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-dark-900 border-r border-white/5 flex flex-col">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 p-6 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">ET Analytics</span>
        </Link>

        {/* Analyst Badge */}
        <div className="p-4 mx-4 mt-4 bg-accent-500/10 border border-accent-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Analyst Portal</div>
              <div className="text-xs text-gray-500">Full Access</div>
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
                  ? 'bg-accent-500/20 text-accent-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Quick Stats */}
        <div className="p-4 border-t border-white/5">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-3 bg-dark-800 rounded-lg">
              <div className="text-lg font-bold text-white">{uploadedRegisters.length}</div>
              <div className="text-xs text-gray-500">In Queue</div>
            </div>
            <div className="p-3 bg-dark-800 rounded-lg">
              <div className="text-lg font-bold text-white">{Object.values(workflows).filter(w => w.phase === 'delivered').length}</div>
              <div className="text-xs text-gray-500">Delivered</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-dark-900/50 border-b border-white/5 flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Analysis Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/issuer"
              className="text-sm px-3 py-1.5 rounded-lg bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700 transition-all flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Switch to Issuer Portal
            </Link>
            <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full text-xs flex items-center justify-center text-white">
                  {notifications}
                </span>
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center text-white text-sm font-medium">
              J
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <WorkflowContext.Provider value={workflowContextValue}>
            <Routes>
              <Route index element={<AnalysisQueue />} />
              <Route path="clients" element={<ClientsList />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="entities" element={<EntityDatabase />} />
              <Route path="etfs" element={<ETFDatabaseView />} />
              <Route path="workflows" element={<Workflows />} />
              <Route path="workflows/:id" element={<WorkflowDetail />} />
              <Route path="settings" element={<AnalystSettings />} />
            </Routes>
          </WorkflowContext.Provider>
        </div>
      </main>
      </div>
    </>
  )
}

// Analysis Queue Component
const AnalysisQueue = () => {
  const navigate = useNavigate()
  const { workflows, activeWorkflowId, setActiveWorkflowId } = useWorkflow()
  const { uploadedRegisters, removeRegister, clearAllRegisters } = useRegisters()
  const [expandedRegisters, setExpandedRegisters] = useState<Set<string>>(new Set())
  
  // Handle delete for uploaded registers
  const handleDeleteRegister = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to remove this register from the queue?')) {
      removeRegister(id)
    }
  }
  
  // Handle clear all uploaded registers
  const handleClearAllUploads = () => {
    if (confirm(`Are you sure you want to remove all ${uploadedRegisters.length} uploaded registers?`)) {
      clearAllRegisters()
    }
  }
  
  
  // Convert uploaded registers to queue item format
  const uploadedQueueItems = uploadedRegisters.map(reg => ({
    id: reg.id,
    issuerId: reg.issuerId,
    issuerName: reg.issuerName,
    issuerLogo: reg.issuerName.charAt(0),  // First letter as logo
    uploadDate: reg.uploadDate,
    fileName: reg.fileName,
    status: reg.status,
    identifiedPct: reg.identifiedPct,
    totalHolders: reg.totalHolders,
    etfs: reg.etfs.map(e => ({ ...e, shares: e.totalShares }))
  }))
  
  // Only use real registers (no demo data)
  const queueItems = uploadedQueueItems
  
  const getWorkflowState = (id: string) => workflows[id] || { phase: 'idle', progress: 0, identifiedPct: 0 }
  
  const handleActionClick = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveWorkflowId(itemId)
    navigate(`/analysis/workflows/${itemId}`)
  }
  
  const getActionButton = (item: typeof queueItems[0]) => {
    const state = getWorkflowState(item.id)
    
    if (state.phase === 'delivered') {
      return (
        <button 
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/issuer/reports/${item.id}`)
          }}
          className="bg-accent-500 hover:bg-accent-600 text-white text-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors"
        >
          <BarChart3 className="w-4 h-4" /> View Report
        </button>
      )
    }
    
    // Only show "View Progress" if actual analysis has started (matching or disclosure phase with progress > 0)
    if ((state.phase === 'matching' || state.phase === 'disclosure') && state.progress > 10) {
      return (
        <button 
          onClick={(e) => handleActionClick(item.id, e)}
          className="bg-purple-500 hover:bg-purple-600 text-white text-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Eye className="w-4 h-4" /> View Progress
        </button>
      )
    }
    
    return (
      <button 
        onClick={(e) => handleActionClick(item.id, e)}
        className="btn-primary text-sm py-2.5 px-5 flex items-center gap-2"
      >
        <Play className="w-4 h-4" /> Start Analysis
      </button>
    )
  }
  
  const getStatusFromWorkflow = (id: string) => {
    const state = getWorkflowState(id)
    // Only show in-progress status if there's actual progress
    if (state.phase === 'delivered') return 'complete'
    if (state.progress > 10) {
      if (state.phase === 'disclosure') return 'disclosure'
      if (state.phase === 'matching') return 'matching'
    }
    return 'new'
  }

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
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
    const styles: Record<string, string> = {
      new: 'bg-primary-500/20 text-primary-400',
      matching: 'bg-yellow-500/20 text-yellow-400',
      disclosure: 'bg-purple-500/20 text-purple-400',
      review: 'bg-cyan-500/20 text-cyan-400',
      complete: 'bg-accent-500/20 text-accent-400'
    }
    return styles[status] || styles.new
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'New',
      loading: 'Initializing',
      matching: 'Matching Entities',
      disclosure: 'Disclosure Phase',
      review: 'Under Review',
      complete: 'Delivered'
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Analysis Queue</h2>
          <p className="text-gray-400">Incoming share registers awaiting analysis</p>
        </div>
        <div className="flex items-center gap-4">
          {uploadedRegisters.length > 0 && (
            <button 
              onClick={handleClearAllUploads}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Clear {uploadedRegisters.length} Uploaded
            </button>
          )}
          <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Queue Cards - Register Level */}
      <div className="space-y-4">
        {queueItems.map((item) => {
          const isExpanded = expandedRegisters.has(item.id)
          const workflowState = getWorkflowState(item.id)
          const status = getStatusFromWorkflow(item.id)
          const isActive = activeWorkflowId === item.id
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card-glass rounded-xl overflow-hidden ${isActive ? 'ring-2 ring-primary-500/50' : ''}`}
            >
              {/* Progress Bar at Top - shows discovered % */}
              {workflowState.progress > 0 && (
                <div className="h-1 bg-dark-800">
                  <motion.div 
                    className={`h-full ${workflowState.phase === 'delivered' ? 'bg-accent-500' : 'bg-gradient-to-r from-primary-500 to-accent-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${workflowState.identifiedPct || 0}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
              
              {/* Register Header */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    {/* Expand/Collapse Button */}
                    <button
                      onClick={(e) => toggleExpand(item.id, e)}
                      className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {/* Issuer Logo */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center text-xl font-bold text-white">
                      {item.issuerLogo}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{item.issuerName} Share Register</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                        {(item.identifiedPct || workflowState.identifiedPct > 0) && workflowState.phase !== 'delivered' && (
                          <span className="text-xs text-gray-500">
                            {((item.identifiedPct || workflowState.identifiedPct) || 0).toFixed(1)}% identified
                          </span>
                        )}
                        {workflowState.phase === 'delivered' && (
                          <span className="text-xs text-accent-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {workflowState.identifiedPct.toFixed(1)}% identified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-4 h-4" />
                          {item.etfs.length} ETF Products
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {item.totalHolders} Holders
                        </span>
                        <span>•</span>
                        <span>{new Date(item.uploadDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Progress indicator for active workflows - shows identified % */}
                    {(item.identifiedPct || workflowState.progress > 10) && workflowState.phase !== 'delivered' && (
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                            animate={{ width: `${item.identifiedPct || workflowState.identifiedPct || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-white font-medium">{(item.identifiedPct || workflowState.identifiedPct || 0).toFixed(1)}%</span>
                      </div>
                    )}
                    {/* Status badge instead of priority */}
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      item.status === 'analyzed' ? 'bg-accent-500/20 text-accent-400' :
                      item.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                      item.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {item.status === 'pending' ? 'PENDING' : 
                       item.status === 'in_progress' ? 'IN PROGRESS' :
                       item.status === 'analyzed' ? 'ANALYZED' : 'DELIVERED'}
                    </div>
                    {getActionButton(item)}
                    
                    {/* Delete button */}
                    {item.status === 'pending' && (
                      <button
                        onClick={(e) => handleDeleteRegister(item.id, e)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded ETF List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-white/5 bg-dark-800/30"
                  >
                    <div className="p-4">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-2">
                        ETF Products in this Register
                      </div>
                      <div className="space-y-2">
                        {item.etfs.map((etf, idx) => (
                          <div 
                            key={etf.isin}
                            className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400">
                                {idx + 1}
                              </div>
                              <div>
                                <div className="font-medium text-white">{etf.name}</div>
                                <div className="text-xs text-gray-500 font-mono">{etf.isin}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-medium">{(etf.shares / 1e6).toFixed(1)}M</div>
                              <div className="text-xs text-gray-500">shares</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// Clients List Component
const ClientsList = () => {
  const { workflows } = useWorkflow()
  const { uploadedRegisters } = useRegisters()
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const [expandedRegisters, setExpandedRegisters] = useState<Set<string>>(new Set())
  const [expandedETFs, setExpandedETFs] = useState<Set<string>>(new Set())

  // Build client data from actual uploaded registers - merge with workflow data for holders
  const clientsData = useMemo(() => {
    // Group registers by issuer
    const issuerGroups: Record<string, typeof uploadedRegisters> = {}
    
    uploadedRegisters.forEach(reg => {
      if (!issuerGroups[reg.issuerId]) {
        issuerGroups[reg.issuerId] = []
      }
      issuerGroups[reg.issuerId].push(reg)
    })
    
    // Convert to client format
    return Object.entries(issuerGroups).map(([issuerId, registers]) => {
      const firstReg = registers[0]
      const totalEtfs = new Set(registers.flatMap(r => r.etfs.map(e => e.isin))).size
      
      return {
        id: issuerId,
        name: firstReg.issuerName,
        logo: firstReg.issuerName.charAt(0),
        etfCount: totalEtfs,
        totalAum: registers.reduce((sum, r) => 
          sum + r.etfs.reduce((eSum, e) => eSum + (e.totalShares * 50), 0), 0),
        clientSince: registers[registers.length - 1]?.uploadDate || '2024-01-01',
        status: 'active' as const,
        registers: registers.map(reg => {
          // Get workflow data for this register to populate ETF holders
          const workflow = workflows[reg.id]
          
          return {
            id: reg.id,
            uploadDate: reg.uploadDate,
            status: reg.status,
            holders: reg.totalHolders,
            totalHolders: reg.totalHolders,
            identifiedPct: workflow?.identifiedPct ?? reg.identifiedPct,
            etfs: reg.etfs.map(etf => {
              // Get ETF-specific data from workflow
              const workflowEtf = workflow?.etfData?.find(e => e.isin === etf.isin)
              
              // Use register-level identifiedPct as fallback if ETF-level not available
              const etfIdentifiedPct = workflowEtf?.identifiedPct ?? 
                (workflow?.identifiedPct ?? reg.identifiedPct ?? 92)
              
              // Build holders from workflow clients
              const holders = workflowEtf?.clients?.map(client => ({
                name: client.name,
                type: 'Decision Maker',
                shares: client.shares,
                pct: client.pct,
                identified: true
              })) || []
              
              // If no client data, calculate from identifiedPct
              const identifiedShares = holders.length > 0 
                ? holders.reduce((sum, h) => sum + h.shares, 0)
                : etf.totalShares * (etfIdentifiedPct / 100)
              const unidentifiedShares = etf.totalShares - identifiedShares
              
              // Add unidentified entry if there are remaining shares
              if (unidentifiedShares > 0 && holders.length > 0) {
                holders.push({
                  name: 'Unidentified',
                  type: 'Unknown',
                  shares: unidentifiedShares,
                  pct: (unidentifiedShares / etf.totalShares) * 100,
                  identified: false
                })
              }
              
              return {
                isin: etf.isin,
                name: etf.name,
                shares: etf.totalShares,
                totalShares: etf.totalShares,
                identifiedPct: etfIdentifiedPct,
                holders
              }
            })
          }
        }).sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [uploadedRegisters, workflows])

  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const toggleRegister = (registerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedRegisters(prev => {
      const newSet = new Set(prev)
      if (newSet.has(registerId)) {
        newSet.delete(registerId)
      } else {
        newSet.add(registerId)
      }
      return newSet
    })
  }

  const toggleETF = (etfKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedETFs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(etfKey)) {
        newSet.delete(etfKey)
      } else {
        newSet.add(etfKey)
      }
      return newSet
    })
  }

  const getStatusBadge = (status: string, registerId?: string) => {
    // Check if there's workflow state for this register
    const workflowState = registerId ? workflows[registerId] : null
    let actualStatus = status
    
    // Override with workflow status if available
    if (workflowState && workflowState.progress > 0) {
      if (workflowState.phase === 'delivered') actualStatus = 'complete'
      else if (workflowState.phase === 'disclosure') actualStatus = 'disclosure'
      else if (workflowState.phase === 'matching') actualStatus = 'matching'
    }
    
    const styles: Record<string, { bg: string, text: string, label: string }> = {
      pending: { bg: 'bg-primary-500/20', text: 'text-primary-400', label: 'Pending' },
      matching: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Matching' },
      disclosure: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'In Progress' },
      complete: { bg: 'bg-accent-500/20', text: 'text-accent-400', label: 'Complete' },
    }
    return styles[actualStatus] || styles.pending
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Client Accounts</h2>
          <p className="text-gray-400">Manage issuer accounts and their share registers</p>
        </div>
        <div className="text-sm text-gray-500">
          {clientsData.length} active clients
        </div>
      </div>

      {/* Clients Table */}
      <div className="card-glass rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-dark-800/50 border-b border-white/5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-1"></div>
          <div className="col-span-3">Client</div>
          <div className="col-span-2">ETF Products</div>
          <div className="col-span-2">Total AUM</div>
          <div className="col-span-2">Registers</div>
          <div className="col-span-2">Status</div>
        </div>

        {/* Client Rows */}
        {clientsData.map((client) => {
          const isClientExpanded = expandedClients.has(client.id)
          return (
            <div key={client.id} className="border-b border-white/5 last:border-0">
              {/* Client Row */}
              <div 
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-white/[0.02] cursor-pointer transition-colors items-center"
                onClick={() => toggleClient(client.id)}
              >
                <div className="col-span-1">
                  <button className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center transition-colors">
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isClientExpanded ? 'rotate-90' : ''}`} />
                  </button>
                </div>
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center text-lg font-bold text-white">
                    {client.logo}
                  </div>
                  <div>
                    <div className="font-medium text-white">{client.name}</div>
                    <div className="text-xs text-gray-500">Since {new Date(client.clientSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-white font-medium">{client.etfCount}</span>
                  <span className="text-gray-500 ml-1">products</span>
                </div>
                <div className="col-span-2">
                  <span className="text-white font-medium">€{(client.totalAum / 1e9).toFixed(0)}B</span>
                </div>
                <div className="col-span-2">
                  <span className="text-white font-medium">{client.registers.length}</span>
                  <span className="text-gray-500 ml-1">registers</span>
                </div>
                <div className="col-span-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent-500/20 text-accent-400">
                    Active
                  </span>
                </div>
              </div>

              {/* Expanded Registers */}
              <AnimatePresence>
                {isClientExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-dark-800/30"
                  >
                    <div className="px-6 py-4 pl-20">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                        Historical Registers ({client.registers.length})
                      </div>
                      <div className="space-y-2">
                        {client.registers.map((register) => {
                          const isRegisterExpanded = expandedRegisters.has(register.id)
                          const workflowState = workflows[register.id]
                          const hasProgress = workflowState && workflowState.progress > 0
                          const identifiedPct = workflowState?.identifiedPct || 0
                          const statusStyle = getStatusBadge(register.status, register.id)
                          
                          return (
                            <div key={register.id} className="bg-dark-700/50 rounded-lg overflow-hidden">
                              {/* Register Row */}
                              <div 
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-700 transition-colors"
                                onClick={(e) => toggleRegister(register.id, e)}
                              >
                                <div className="flex items-center gap-4">
                                  <button className="w-6 h-6 rounded bg-dark-600 hover:bg-dark-500 flex items-center justify-center transition-colors">
                                    <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isRegisterExpanded ? 'rotate-90' : ''}`} />
                                  </button>
                                  <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <div>
                                    <div className="text-white font-medium">
                                      Register — {new Date(register.uploadDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      <span>{register.totalHolders || register.holders} holders</span>
                                      <span>•</span>
                                      <span>{register.etfs?.length || 0} ETFs</span>
                                      {hasProgress && (
                                        <>
                                          <span>•</span>
                                          <span className="text-accent-400 font-medium">{identifiedPct.toFixed(1)}% identified</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {hasProgress && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 h-2 bg-dark-800 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                                          style={{ width: `${identifiedPct}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-white font-medium w-12 text-right">{identifiedPct.toFixed(1)}%</span>
                                    </div>
                                  )}
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                    {statusStyle.label}
                                  </span>
                                </div>
                              </div>

                              {/* Expanded ETFs */}
                              <AnimatePresence>
                                {isRegisterExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="border-t border-white/5 bg-dark-800/50"
                                  >
                                    <div className="p-4 pl-14 space-y-2">
                                      {register.etfs.map((etf, idx) => {
                                        const etfKey = `${register.id}-${etf.isin}`
                                        const isETFExpanded = expandedETFs.has(etfKey)
                                        // Use the pre-calculated identifiedPct from workflow (same as register level)
                                        // Don't recalculate - use the source of truth for consistency
                                        const etfIdentifiedPct = etf.identifiedPct || register.identifiedPct || 0
                                        
                                        return (
                                          <div key={etf.isin} className="bg-dark-700/30 rounded-lg overflow-hidden">
                                            {/* ETF Row */}
                                            <div 
                                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-dark-700/50 transition-colors"
                                              onClick={(e) => toggleETF(etfKey, e)}
                                            >
                                              <div className="flex items-center gap-3">
                                                <button className="w-5 h-5 rounded bg-dark-600 hover:bg-dark-500 flex items-center justify-center transition-colors">
                                                  <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isETFExpanded ? 'rotate-90' : ''}`} />
                                                </button>
                                                <div className="w-6 h-6 rounded bg-primary-500/20 flex items-center justify-center text-xs font-medium text-primary-400">
                                                  {idx + 1}
                                                </div>
                                                <div>
                                                  <div className="text-sm text-white">{etf.name}</div>
                                                  <div className="text-xs text-gray-500 font-mono">{etf.isin}</div>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                  <div className="text-xs text-gray-500">Identified</div>
                                                  <div className="text-sm text-accent-400 font-medium">{typeof etfIdentifiedPct === 'number' ? etfIdentifiedPct.toFixed(1) : etfIdentifiedPct}%</div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="text-sm text-white font-medium">{(etf.shares / 1e6).toFixed(1)}M</div>
                                                  <div className="text-xs text-gray-500">shares</div>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Expanded Holders */}
                                            <AnimatePresence>
                                              {isETFExpanded && (
                                                <motion.div
                                                  initial={{ height: 0, opacity: 0 }}
                                                  animate={{ height: 'auto', opacity: 1 }}
                                                  exit={{ height: 0, opacity: 0 }}
                                                  transition={{ duration: 0.12 }}
                                                  className="border-t border-white/5 bg-dark-900/50"
                                                >
                                                  <div className="p-3 pl-12">
                                                    {/* Holders Header */}
                                                    <div className="grid grid-cols-12 gap-4 text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">
                                                      <div className="col-span-5">Holder</div>
                                                      <div className="col-span-3">Type</div>
                                                      <div className="col-span-2 text-right">Shares</div>
                                                      <div className="col-span-2 text-right">% of Total</div>
                                                    </div>
                                                    {/* Holder Rows */}
                                                    <div className="space-y-1">
                                                      {etf.holders.map((holder, hIdx) => (
                                                        <div 
                                                          key={hIdx}
                                                          className={`grid grid-cols-12 gap-4 p-3 rounded-lg ${
                                                            holder.identified 
                                                              ? 'bg-dark-700/50 hover:bg-dark-700' 
                                                              : 'bg-yellow-500/5 border border-yellow-500/20'
                                                          } transition-colors`}
                                                        >
                                                          <div className="col-span-5 flex items-center gap-2">
                                                            {holder.identified ? (
                                                              <div className="w-2 h-2 rounded-full bg-accent-500"></div>
                                                            ) : (
                                                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                            )}
                                                            <span className={`text-sm ${holder.identified ? 'text-white' : 'text-yellow-400'}`}>
                                                              {holder.name}
                                                            </span>
                                                          </div>
                                                          <div className="col-span-3">
                                                            <span className={`text-xs px-2 py-1 rounded ${
                                                              holder.identified 
                                                                ? 'bg-gray-700 text-gray-300' 
                                                                : 'bg-yellow-500/20 text-yellow-400'
                                                            }`}>
                                                              {holder.type}
                                                            </span>
                                                          </div>
                                                          <div className="col-span-2 text-right">
                                                            <span className="text-sm text-white font-medium">
                                                              {(holder.shares / 1e6).toFixed(1)}M
                                                            </span>
                                                          </div>
                                                          <div className="col-span-2 text-right">
                                                            <span className={`text-sm font-medium ${
                                                              holder.identified ? 'text-accent-400' : 'text-yellow-400'
                                                            }`}>
                                                              {holder.pct.toFixed(1)}%
                                                            </span>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                    {/* Summary */}
                                                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center px-3">
                                                      <div className="flex items-center gap-4 text-xs">
                                                        <span className="flex items-center gap-1.5">
                                                          <div className="w-2 h-2 rounded-full bg-accent-500"></div>
                                                          <span className="text-gray-400">Identified: {etf.holders.filter(h => h.identified).length} entities</span>
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                          <span className="text-gray-400">Unidentified: {(100 - parseFloat(identifiedPct)).toFixed(1)}%</span>
                                                        </span>
                                                      </div>
                                                      <div className="text-xs text-gray-500">
                                                        Total: {(etf.shares / 1e6).toFixed(1)}M shares
                                                      </div>
                                                    </div>
                                                  </div>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Client Detail Component
const ClientDetail = () => {
  const location = useLocation()
  const issuer = sampleIssuers[0] // For demo
  const etfs = sampleETFs.filter(e => e.issuerId === 'iss-001')
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{issuer.name}</h2>
            <p className="text-gray-400">{issuer.etfCount} ETF Products • €{(issuer.totalAum / 1e9).toFixed(1)}B AUM</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Export All
          </button>
        </div>
      </div>

      {/* ETF Products */}
      <div className="card-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">ETF Products</h3>
        <div className="space-y-3">
          {etfs.map((etf) => (
            <div 
              key={etf.id}
              className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl hover:bg-dark-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <div className="font-medium text-white">{etf.name}</div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="font-mono">{etf.isin}</span>
                    <span>•</span>
                    <span>{etf.ticker}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-white font-medium">€{(etf.aum / 1e9).toFixed(1)}B</div>
                  <div className="text-xs text-gray-500">AUM</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">67%</div>
                  <div className="text-xs text-gray-500">Identified</div>
                </div>
                <button className="p-2 text-gray-400 hover:text-white">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Registers */}
      <div className="card-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Recent Share Registers</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>ETF</th>
              <th>Upload Date</th>
              <th>As Of Date</th>
              <th>Holders</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-medium text-white">MSCI World UCITS ETF</td>
              <td>Jan 13, 2026</td>
              <td>Jan 10, 2026</td>
              <td>47</td>
              <td>
                <span className="px-2 py-1 rounded-full text-xs bg-primary-500/20 text-primary-400">
                  Pending
                </span>
              </td>
              <td>
                <button className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                  Analyze <ArrowRight className="w-4 h-4" />
                </button>
              </td>
            </tr>
            <tr>
              <td className="font-medium text-white">S&P 500 UCITS ETF</td>
              <td>Jan 10, 2026</td>
              <td>Jan 8, 2026</td>
              <td>38</td>
              <td>
                <span className="px-2 py-1 rounded-full text-xs bg-accent-500/20 text-accent-400">
                  Complete
                </span>
              </td>
              <td>
                <button className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                  View <ExternalLink className="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Entity Database Component
const EntityDatabase = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<EntityType | 'all'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEntity, setEditingEntity] = useState<KnownEntity | null>(null)
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null)

  const filteredEntities = knownEntities.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.nomineeNames.some(n => n.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = filterType === 'all' || entity.type === filterType
    return matchesSearch && matchesType
  })

  const entityTypes: EntityType[] = [
    'csd', 'global_custodian', 'local_custodian', 'dedicated_nominee', 'pooled_nominee',
    'wealth_manager', 'private_bank', 'platform', 'asset_manager', 'pension_fund',
    'insurance', 'fund_of_funds', 'market_maker', 'unknown'
  ]

  // Group entities by type for stats
  const typeStats = entityTypes.reduce((acc, type) => {
    acc[type] = knownEntities.filter(e => e.type === type).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Entity Database</h2>
          <p className="text-gray-400">{knownEntities.length} entities • Manage custodians, nominees, and identifiers</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Entity
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { type: 'csd', label: 'CSDs', color: 'bg-purple-500' },
          { type: 'global_custodian', label: 'Global Cust.', color: 'bg-indigo-500' },
          { type: 'wealth_manager', label: 'Wealth Mgrs', color: 'bg-emerald-500' },
          { type: 'private_bank', label: 'Private Banks', color: 'bg-cyan-500' },
          { type: 'platform', label: 'Platforms', color: 'bg-sky-500' },
          { type: 'asset_manager', label: 'Asset Mgrs', color: 'bg-teal-500' },
          { type: 'pooled_nominee', label: 'Pooled', color: 'bg-yellow-500' },
          { type: 'market_maker', label: 'Market Makers', color: 'bg-rose-500' },
        ].map(({ type, label, color }) => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? 'all' : type as EntityType)}
            className={`px-3 py-2 rounded-lg text-center transition-all ${
              filterType === type 
                ? 'bg-white/10 border border-white/20' 
                : 'bg-dark-800 hover:bg-dark-700 border border-transparent'
            }`}
          >
            <div className={`w-2 h-2 ${color} rounded-full mx-auto mb-1`} />
            <div className="text-lg font-bold text-white">{typeStats[type] || 0}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search entities or nominee names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-white/10 rounded-lg focus:border-accent-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as EntityType | 'all')}
          className="bg-dark-800 border border-white/10 rounded-lg px-4 py-2"
        >
          <option value="all">All Types ({knownEntities.length})</option>
          {entityTypes.map(type => (
            <option key={type} value={type}>{getEntityTypeLabel(type)} ({typeStats[type] || 0})</option>
          ))}
        </select>
      </div>

      {/* Entity Table Header */}
      <div className="card-glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-dark-800/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Entity Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-1">Country</div>
          <div className="col-span-2">LEI</div>
          <div className="col-span-2">Tags</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Entity Rows */}
        <div className="divide-y divide-white/5">
          {filteredEntities.map((entity) => (
            <div key={entity.id}>
              {/* Main Row */}
              <div 
                className={`grid grid-cols-12 gap-4 px-5 py-4 cursor-pointer transition-all hover:bg-white/5 ${
                  expandedEntity === entity.id ? 'bg-white/5' : ''
                }`}
                onClick={() => setExpandedEntity(expandedEntity === entity.id ? null : entity.id)}
              >
                <div className="col-span-3 flex items-center gap-3">
                  <ChevronRight 
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      expandedEntity === entity.id ? 'rotate-90' : ''
                    }`} 
                  />
                  <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-sm font-bold text-gray-400">
                    {entity.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-white">{entity.name}</div>
                    {entity.aumBand && (
                      <div className="text-xs text-gray-500">{entity.aumBand}</div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs ${getEntityTypeColor(entity.type)}`}>
                    {getEntityTypeLabel(entity.type)}
                  </span>
                </div>
                <div className="col-span-1 flex items-center text-sm text-gray-400">
                  {entity.country}
                </div>
                <div className="col-span-2 flex items-center">
                  {entity.lei ? (
                    <span className="text-xs font-mono text-gray-500">{entity.lei.substring(0, 10)}...</span>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </div>
                <div className="col-span-2 flex items-center gap-1 flex-wrap">
                  {entity.tags?.slice(0, 2).map((tag, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-dark-700 rounded text-xs text-gray-500">
                      {tag}
                    </span>
                  ))}
                  {entity.tags && entity.tags.length > 2 && (
                    <span className="text-xs text-gray-600">+{entity.tags.length - 2}</span>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingEntity(entity) }}
                    className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedEntity === entity.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 py-5 bg-dark-800/30 border-t border-white/5">
                      <div className="grid grid-cols-3 gap-6">
                        {/* Column 1: Basic Info */}
                        <div className="space-y-4">
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Basic Information</div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-500 text-sm">Full Name</span>
                                <span className="text-white text-sm">{entity.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 text-sm">Country</span>
                                <span className="text-white text-sm">{entity.country}</span>
                              </div>
                              {entity.lei && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 text-sm">LEI</span>
                                  <span className="text-white text-sm font-mono text-xs">{entity.lei}</span>
                                </div>
                              )}
                              {entity.fcaRef && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 text-sm">FCA Reference</span>
                                  <span className="text-white text-sm">{entity.fcaRef}</span>
                                </div>
                              )}
                              {entity.aumBand && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 text-sm">AUM</span>
                                  <span className="text-white text-sm">{entity.aumBand}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Column 2: Nominee Names */}
                        <div className="space-y-4">
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Nominee Account Names</div>
                            <div className="space-y-1">
                              {entity.nomineeNames.map((name, i) => (
                                <div key={i} className="px-3 py-2 bg-dark-700 rounded-lg text-sm text-gray-300">
                                  {name}
                                </div>
                              ))}
                            </div>
                          </div>
                          {entity.nameVariations && entity.nameVariations.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Name Variations</div>
                              <div className="flex flex-wrap gap-1">
                                {entity.nameVariations.map((name, i) => (
                                  <span key={i} className="px-2 py-1 bg-dark-700/50 rounded text-xs text-gray-400">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Column 3: Classification & Notes */}
                        <div className="space-y-4">
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Classification</div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Entity Type</span>
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs ${getEntityTypeColor(entity.type)}`}>
                                  {getEntityTypeLabel(entity.type)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Disclosure Level</span>
                                <span className={`text-sm ${
                                  entity.tags?.includes('level_0') ? 'text-green-400' :
                                  entity.tags?.includes('requires_disclosure') ? 'text-yellow-400' :
                                  entity.tags?.includes('always_drill_down') ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                  {entity.tags?.includes('level_0') ? 'Level 0 (Final)' :
                                   entity.tags?.includes('requires_disclosure') ? 'Requires Disclosure' :
                                   entity.tags?.includes('always_drill_down') ? 'Always Drill Down' : 'Standard'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {entity.tags && entity.tags.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tags</div>
                              <div className="flex flex-wrap gap-1">
                                {entity.tags.map((tag, i) => (
                                  <span key={i} className="px-2 py-1 bg-primary-500/10 text-primary-400 rounded text-xs">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {entity.notes && (
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Notes</div>
                              <p className="text-sm text-gray-400 bg-dark-700/50 rounded-lg p-3">
                                {entity.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Results Footer */}
        <div className="px-5 py-3 bg-dark-800/30 border-t border-white/5 text-sm text-gray-500">
          Showing {filteredEntities.length} of {knownEntities.length} entities
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingEntity) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowAddModal(false); setEditingEntity(null) }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-dark-900 rounded-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {editingEntity ? 'Edit Entity' : 'Add New Entity'}
                </h3>
                <button 
                  onClick={() => { setShowAddModal(false); setEditingEntity(null) }}
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Entity Name</label>
                  <input
                    type="text"
                    defaultValue={editingEntity?.name || ''}
                    placeholder="e.g., Brewin Dolphin"
                    className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Entity Type</label>
                  <select
                    defaultValue={editingEntity?.type || ''}
                    className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-3"
                  >
                    {entityTypes.map(type => (
                      <option key={type} value={type}>{getEntityTypeLabel(type)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Country</label>
                  <input
                    type="text"
                    defaultValue={editingEntity?.country || ''}
                    placeholder="e.g., United Kingdom"
                    className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">LEI (Optional)</label>
                  <input
                    type="text"
                    defaultValue={editingEntity?.lei || ''}
                    placeholder="20-character Legal Entity Identifier"
                    className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Nominee Account Names</label>
                  <textarea
                    defaultValue={editingEntity?.nomineeNames.join('\n') || ''}
                    placeholder="One per line, e.g.:&#10;BREWIN DOLPHIN NOMINEES LIMITED&#10;BREWIN NOMINEES LTD"
                    rows={3}
                    className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-3"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <button 
                  onClick={() => { setShowAddModal(false); setEditingEntity(null) }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button className="btn-primary">
                  {editingEntity ? 'Save Changes' : 'Add Entity'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Workflows Component
const Workflows = () => {
  const navigate = useNavigate()
  const { workflows } = useWorkflow()
  const { uploadedRegisters } = useRegisters()
  
  // Build register metadata dynamically from uploaded registers
  const registerMetadata = useMemo(() => {
    const metadata: Record<string, { issuerName: string; issuerLogo: string; uploadDate: string; etfCount: number }> = {}
    uploadedRegisters.forEach(reg => {
      metadata[reg.id] = {
        issuerName: reg.issuerName,
        issuerLogo: reg.issuerName.charAt(0),
        uploadDate: reg.uploadDate,
        etfCount: reg.etfs.length
      }
    })
    return metadata
  }, [uploadedRegisters])
  
  // Filter registers that have been started (progress > 0)
  const startedWorkflows = Object.entries(workflows)
    .filter(([_, state]) => state.progress > 0)
    .filter(([id]) => registerMetadata[id]) // Only include workflows for existing registers
    .map(([id, state]) => ({
      id,
      ...state,
      ...registerMetadata[id]
    }))
  
  // Split into Open and Closed & Sent
  const openWorkflows = startedWorkflows.filter(w => w.phase !== 'delivered')
  const closedWorkflows = startedWorkflows.filter(w => w.phase === 'delivered')
  
  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      loading: 'Initializing',
      matching: 'Matching',
      disclosure: 'Disclosure',
      delivered: 'Closed & Sent'
    }
    return labels[phase] || phase
  }
  
  const getPhaseStyles = (phase: string) => {
    const styles: Record<string, string> = {
      loading: 'bg-gray-500/20 text-gray-400',
      matching: 'bg-yellow-500/20 text-yellow-400',
      disclosure: 'bg-purple-500/20 text-purple-400',
      delivered: 'bg-accent-500/20 text-accent-400'
    }
    return styles[phase] || styles.loading
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Analysis Workflows</h2>
        <p className="text-gray-400">Select a share register to view or continue analysis</p>
      </div>

      {/* No workflows started yet */}
      {startedWorkflows.length === 0 && (
        <div className="card-glass rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Active Workflows</h3>
          <p className="text-gray-400 mb-6">Start an analysis from the Queue to see it here</p>
          <button 
            onClick={() => navigate('/analysis')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Layers className="w-4 h-4" /> Go to Queue
          </button>
        </div>
      )}

      {/* Open Workflows */}
      {openWorkflows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
            <h3 className="text-lg font-semibold text-white">Open ({openWorkflows.length})</h3>
          </div>
          
          <div className="space-y-3">
            {openWorkflows.map((workflow) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-glass rounded-xl p-5 cursor-pointer hover:border-primary-500/30 transition-all"
                onClick={() => navigate(`/analysis/workflows/${workflow.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center text-xl font-bold text-white">
                      {workflow.issuerName?.charAt(0) || 'R'}
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {workflow.issuerName} Share Register
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(workflow.uploadDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {workflow.etfCount} ETF Products
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Identified Progress - calculated using tree traversal */}
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                            style={{ width: `${calculateTrueIdentifiedPct(workflow)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-white w-14 text-right">
                          {calculateTrueIdentifiedPct(workflow).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Identified</div>
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getPhaseStyles(workflow.phase)}`}>
                      {getPhaseLabel(workflow.phase)}
                    </span>
                    
                    {/* Open Button */}
                    <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                      Open <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Closed & Sent */}
      {closedWorkflows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-500" />
            <h3 className="text-lg font-semibold text-white">Closed & Sent ({closedWorkflows.length})</h3>
          </div>
          
          <div className="space-y-3">
            {closedWorkflows.map((workflow) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-glass rounded-xl p-5 cursor-pointer hover:border-accent-500/30 transition-all bg-accent-500/5"
                onClick={() => navigate(`/analysis/workflows/${workflow.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center text-xl font-bold text-accent-400">
                      {workflow.issuerName?.charAt(0) || 'R'}
                    </div>
                    <div>
                      <div className="font-medium text-white flex items-center gap-2">
                        {workflow.issuerName} Share Register
                        <CheckCircle className="w-4 h-4 text-accent-400" />
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(workflow.uploadDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {workflow.etfCount} ETF Products
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Final Identified - calculated using tree traversal */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-accent-400">
                        {calculateTrueIdentifiedPct(workflow).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Identified</div>
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getPhaseStyles(workflow.phase)}`}>
                      {getPhaseLabel(workflow.phase)}
                    </span>
                    
                    {/* View Report Button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/issuer/reports/${workflow.registerId || workflow.id}`)
                      }}
                      className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      View Report <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Workflow Detail Component (Analysis Process)
const WorkflowDetail = () => {
  const navigate = useNavigate()
  const { id: registerId } = useParams<{ id: string }>()
  const { workflows, updateWorkflow, setActiveWorkflowId } = useWorkflow()
  const { uploadedRegisters, getRegister } = useRegisters()
  
  // Check if this is an uploaded register
  const uploadedRegister = registerId ? getRegister(registerId) : null
  
  // Build register metadata dynamically from uploaded registers only (NO fake data)
  const registerMetadata = useMemo(() => {
    const metadata: Record<string, { 
      issuerName: string
      issuerLogo: string
      uploadDate: string
      etfCount: number
      totalHolders: number
    }> = {}
    
    uploadedRegisters.forEach(reg => {
      metadata[reg.id] = {
        issuerName: reg.issuerName,
        issuerLogo: reg.issuerName.charAt(0),
        uploadDate: reg.uploadDate,
        etfCount: reg.etfs.length,
        totalHolders: reg.totalHolders
      }
    })
    
    return metadata
  }, [uploadedRegisters])
  
  // Get register info based on current registerId - with fallback
  const currentRegisterInfo = registerId && registerMetadata[registerId] 
    ? registerMetadata[registerId] 
    : { issuerName: 'Unknown', issuerLogo: '?', uploadDate: new Date().toISOString().split('T')[0], etfCount: 0, totalHolders: 0 }
  
  // Get current workflow state from context
  const currentWorkflow = registerId ? workflows[registerId] : null
  const savedPhase = currentWorkflow?.phase
  const savedProgress = currentWorkflow?.progress || 0
  const savedNominees = currentWorkflow?.nominees
  const savedEtfData = currentWorkflow?.etfData
  const hasSavedState = savedProgress > 10 && savedNominees && savedNominees.length > 0
  
  // Workflow phases - initialize from saved state if exists AND has meaningful progress
  const [phase, setPhase] = useState<'loading' | 'matching' | 'disclosure' | 'complete'>(() => {
    // Only restore state if there's actual progress
    if (hasSavedState) {
      if (savedPhase === 'disclosure') return 'disclosure'
      if (savedPhase === 'delivered') return 'complete'
      if (savedPhase === 'matching') return 'matching'
    }
    return 'loading'
  })
  const [loadingStep, setLoadingStep] = useState(hasSavedState ? 5 : 0)
  const [matchingProgress, setMatchingProgress] = useState(hasSavedState ? 100 : 0)
  const [expandedNominees, setExpandedNominees] = useState<Set<string>>(new Set())
  const [expandedETFs, setExpandedETFs] = useState<Set<string>>(new Set())
  const [hasStartedMatching, setHasStartedMatching] = useState(hasSavedState)
  
  // Manual disclosure flow state
  const [addingLevelFor, setAddingLevelFor] = useState<string | null>(null)  // nomineeId currently adding level
  const [editingNominee, setEditingNominee] = useState<string | null>(null)  // nomineeId currently being edited
  const [entitySearch, setEntitySearch] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<{ name: string; type: string } | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)  // Modal for creating new entity
  const [createModalNomineeId, setCreateModalNomineeId] = useState<string | null>(null)  // Which nominee the modal is for
  const [newEntityName, setNewEntityName] = useState('')
  const [newEntityType, setNewEntityType] = useState('Global Custodian')
  
  // Add Node Modal state (for adding child/sibling to tree)
  const [showAddNodeModal, setShowAddNodeModal] = useState(false)
  const [addNodeContext, setAddNodeContext] = useState<{
    nomineeId: string
    parentNodeId: string | null  // null = adding to root level
    mode: 'child' | 'sibling'
    siblingNodeId?: string  // for sibling mode, which node to add sibling to
    availableHoldings: Record<string, number>  // max shares available per ETF
  } | null>(null)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodeType, setNewNodeType] = useState('Global Custodian')
  const [newNodeHoldings, setNewNodeHoldings] = useState<Record<string, number>>({})
  const [newNodeIsTerminal, setNewNodeIsTerminal] = useState(false)
  
  // Full tree view modal
  const [showFullTreeView, setShowFullTreeView] = useState(false)
  const [fullTreeNomineeId, setFullTreeNomineeId] = useState<string | null>(null)
  
  // Local entities (added during session)
  const [localEntities, setLocalEntities] = useState<KnownEntity[]>([])
  
  // Combined entities (imported + local)
  const allKnownEntities = [...knownEntities, ...localEntities]
  
  // Handler to add a new entity to the database
  const handleCreateEntity = (entity: KnownEntity) => {
    setLocalEntities(prev => [...prev, entity])
    console.log('New entity added to database:', entity)
  }
  
  // Open full tree view for a nominee
  const openFullTreeView = (nomineeId: string) => {
    setFullTreeNomineeId(nomineeId)
    setShowFullTreeView(true)
  }
  
  // Open modal to add a node
  const openAddNodeModal = (
    nomineeId: string, 
    parentNodeId: string | null, 
    mode: 'child' | 'sibling',
    siblingNodeId?: string
  ) => {
    const nominee = nominees.find(n => n.id === nomineeId)
    if (!nominee) return
    
    // Calculate available holdings based on parent/siblings
    let availableHoldings: Record<string, number> = {}
    
    if (mode === 'child' && parentNodeId) {
      // Adding child - available = parent's holdings minus existing children
      const findNode = (node: TreeNode): TreeNode | null => {
        if (node.id === parentNodeId) return node
        for (const child of node.children) {
          const found = findNode(child)
          if (found) return found
        }
        return null
      }
      const parentNode = nominee.tree ? findNode(nominee.tree) : null
      if (parentNode) {
        defaultEtfProducts.forEach(etf => {
          const parentShares = parentNode.holdings[etf.isin] || 0
          const childrenShares = parentNode.children.reduce((sum, c) => sum + (c.holdings[etf.isin] || 0), 0)
          availableHoldings[etf.isin] = Math.max(parentShares - childrenShares, 0)
        })
      }
    } else if (mode === 'sibling' && parentNodeId) {
      // Adding sibling - available = parent's holdings minus all siblings
      const findParentAndSiblings = (node: TreeNode, targetParentId: string): { parent: TreeNode, siblings: TreeNode[] } | null => {
        if (node.id === targetParentId) {
          return { parent: node, siblings: node.children }
        }
        for (const child of node.children) {
          const found = findParentAndSiblings(child, targetParentId)
          if (found) return found
        }
        return null
      }
      const result = nominee.tree ? findParentAndSiblings(nominee.tree, parentNodeId) : null
      if (result) {
        defaultEtfProducts.forEach(etf => {
          const parentShares = result.parent.holdings[etf.isin] || 0
          const siblingsShares = result.siblings.reduce((sum, s) => sum + (s.holdings[etf.isin] || 0), 0)
          availableHoldings[etf.isin] = Math.max(parentShares - siblingsShares, 0)
        })
      }
    } else {
      // Adding first child to root (nominee level)
      defaultEtfProducts.forEach(etf => {
        availableHoldings[etf.isin] = nominee.holdings[etf.isin] || 0
      })
    }
    
    setAddNodeContext({ nomineeId, parentNodeId, mode, siblingNodeId, availableHoldings })
    setNewNodeName('')
    setNewNodeType('Global Custodian')
    setNewNodeHoldings({})
    setNewNodeIsTerminal(false)
    setShowAddNodeModal(true)
  }
  
  // Initialize tree for a nominee (create root level from nominee holdings)
  const initializeTree = (nomineeId: string) => {
    setNominees(prev => {
      const updated = prev.map(nom => {
        if (nom.id === nomineeId && !nom.tree) {
          // Create the root tree node representing Level 0
          const rootNode: TreeNode = {
            id: `tree-${nomineeId}-root`,
            name: nom.name,
            type: 'Nominee (Level 0)',
            level: 0,
            holdings: { ...nom.holdings },
            isTerminal: false,
            children: []
          }
          return { ...nom, tree: rootNode, status: 'level-0' }
        }
        return nom
      })
      if (registerId) {
        updateWorkflow(registerId, { nominees: updated })
      }
      return updated
    })
  }
  
  // Set this as active workflow on mount
  useEffect(() => {
    if (registerId) {
      setActiveWorkflowId(registerId)
    }
  }, [registerId, setActiveWorkflowId])

  // Default ETF products data - use uploaded register if available, otherwise demo data
  const defaultEtfProducts = uploadedRegister 
    ? uploadedRegister.etfs.map(etf => ({
        isin: etf.isin,
        name: etf.name,
        totalShares: etf.totalShares,  // Fixed: was incorrectly etf.shares
        identifiedPct: 0
      }))
    : [
        { isin: 'IE00B4L5Y983', name: 'MSCI World UCITS ETF', totalShares: 126952000, identifiedPct: 0 },
        { isin: 'IE00B5BMR087', name: 'S&P 500 UCITS ETF', totalShares: 82458000, identifiedPct: 0 },
        { isin: 'IE00BK5BQT80', name: 'FTSE All-World UCITS ETF', totalShares: 104520000, identifiedPct: 0 },
        { isin: 'IE00B4L5YC18', name: 'Euro Stoxx 50 UCITS ETF', totalShares: 57312000, identifiedPct: 0 },
        { isin: 'IE00B3RBWM25', name: 'Emerging Markets UCITS ETF', totalShares: 68237000, identifiedPct: 0 },
      ]

  // Generate nominees from uploaded register
  const generateNomineesFromUpload = (register: UploadedRegister) => {
    return register.nominees.map((nom, index) => {
      const totalShares = Object.values(nom.holdings).reduce((sum, v) => sum + v, 0)
      return {
        id: `nom-uploaded-${index}`,
        name: nom.name,
        accountNumber: '',
        status: 'unmatched' as const,
        level: 0,
        confidence: 0,
        totalShares,
        holdings: nom.holdings,
        custodyChain: [] as { level: number; name: string; type: string; resolved: boolean }[]
      }
    })
  }

  // Default nominee accounts with multi-level custody chains
  // Default nominees with realistic custody chain structures:
  // - CSD → Global Custodian → (Regional/Local Custodian) → Client
  // - Never: Private Bank → Investment Manager (doesn't happen in practice)
  // - Dedicated accounts (with account number): identifiable immediately
  // - Pooled accounts (no account number): require disclosure
  // - Execution platforms: Level 0 - next level is retail client, no need to drill
  // NOTE: Holdings MUST sum to exactly ETF totalShares to avoid >100% discovered
  // ETF totals: IE00B4L5Y983=126952000, IE00B5BMR087=82458000, IE00BK5BQT80=104520000, IE00B4L5YC18=57312000, IE00B3RBWM25=68237000
  // Holdings are calculated to sum EXACTLY to these totals
  const demoNominees = [
    // DEDICATED NOMINEE - Direct match (Level 0) - 6.5% of each ETF
    {
      id: 'nom-001',
      name: 'BREWIN NOMINEES',
      accountNumber: '',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 28570000,
      holdings: { 'IE00B4L5Y983': 8252000, 'IE00B5BMR087': 5360000, 'IE00BK5BQT80': 6794000, 'IE00B4L5YC18': 3725000, 'IE00B3RBWM25': 4439000 },
      custodyChain: [
        { level: 1, name: 'Brewin Dolphin', type: 'Wealth Manager', resolved: true }
      ]
    },
    // EXECUTION PLATFORM - 5.5% of each ETF
    {
      id: 'nom-002',
      name: 'HARGREAVES LANSDOWN NOMINEES LIMITED',
      accountNumber: 'HL445566',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 24167000,
      holdings: { 'IE00B4L5Y983': 6982000, 'IE00B5BMR087': 4535000, 'IE00BK5BQT80': 5749000, 'IE00B4L5YC18': 3152000, 'IE00B3RBWM25': 3749000 },
      custodyChain: [
        { level: 1, name: 'Hargreaves Lansdown', type: 'Execution Platform', resolved: true }
      ]
    },
    // DEDICATED ACCOUNT - 4.5% of each ETF
    {
      id: 'nom-003',
      name: 'STATE STREET NOMINEES LIMITED A/C 12N',
      accountNumber: '12N',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 19773000,
      holdings: { 'IE00B4L5Y983': 5713000, 'IE00B5BMR087': 3711000, 'IE00BK5BQT80': 4703000, 'IE00B4L5YC18': 2579000, 'IE00B3RBWM25': 3067000 },
      custodyChain: [
        { level: 1, name: 'Rathbones Group', type: 'Wealth Manager', resolved: true }
      ]
    },
    // CSD EUROCLEAR - 30% of each ETF (biggest holder, needs disclosure)
    {
      id: 'nom-004',
      name: 'EUROCLEAR NOMINEES LIMITED',
      accountNumber: '',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 131843000,
      holdings: { 'IE00B4L5Y983': 38086000, 'IE00B5BMR087': 24737000, 'IE00BK5BQT80': 31356000, 'IE00B4L5YC18': 17194000, 'IE00B3RBWM25': 20470000 },
      custodyChain: [
        { level: 1, name: 'Euroclear Bank SA/NV', type: 'CSD (Level 1)', resolved: false },
        { level: 2, name: 'BNY Mellon', type: 'Global Custodian', resolved: false },
        { level: 3, name: 'Coutts & Co', type: 'Private Bank', resolved: false }
      ]
    },
    // POOLED STATE STREET - 6% of each ETF
    {
      id: 'nom-005',
      name: 'STATE STREET NOMINEES LIMITED',
      accountNumber: '',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 26369000,
      holdings: { 'IE00B4L5Y983': 7617000, 'IE00B5BMR087': 4947000, 'IE00BK5BQT80': 6271000, 'IE00B4L5YC18': 3439000, 'IE00B3RBWM25': 4095000 },
      custodyChain: [
        { level: 1, name: 'State Street Bank', type: 'Global Custodian', resolved: false },
        { level: 2, name: 'Julius Baer', type: 'Private Bank', resolved: false }
      ]
    },
    // CSD CLEARSTREAM - 22% of each ETF (Japan chain)
    {
      id: 'nom-006',
      name: 'CLEARSTREAM NOMINEES LIMITED',
      accountNumber: '',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 96685000,
      holdings: { 'IE00B4L5Y983': 27929000, 'IE00B5BMR087': 18141000, 'IE00BK5BQT80': 22994000, 'IE00B4L5YC18': 12609000, 'IE00B3RBWM25': 15012000 },
      custodyChain: [
        { level: 1, name: 'Clearstream Banking S.A.', type: 'CSD (Level 1)', resolved: false },
        { level: 2, name: 'Citibank N.A.', type: 'Global Custodian', resolved: false },
        { level: 3, name: 'Mizuho Trust & Banking', type: 'Regional Custodian (Japan)', resolved: false },
        { level: 4, name: 'SMBC Trust Bank', type: 'Local Custodian', resolved: false },
        { level: 5, name: 'Nomura Asset Management', type: 'Asset Manager', resolved: false }
      ]
    },
    // EXECUTION PLATFORM Interactive Investor - 4% of each ETF
    {
      id: 'nom-007',
      name: 'INTERACTIVE INVESTOR NOMINEES LIMITED',
      accountNumber: 'II990011',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 17576000,
      holdings: { 'IE00B4L5Y983': 5078000, 'IE00B5BMR087': 3298000, 'IE00BK5BQT80': 4181000, 'IE00B4L5YC18': 2292000, 'IE00B3RBWM25': 2727000 },
      custodyChain: [
        { level: 1, name: 'Interactive Investor', type: 'Execution Platform', resolved: true }
      ]
    },
    // DEDICATED STATE STREET 45B - 3.5% of each ETF
    {
      id: 'nom-008',
      name: 'STATE STREET NOMINEES LIMITED A/C 45B',
      accountNumber: '45B',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 15379000,
      holdings: { 'IE00B4L5Y983': 4443000, 'IE00B5BMR087': 2886000, 'IE00BK5BQT80': 3658000, 'IE00B4L5YC18': 2006000, 'IE00B3RBWM25': 2386000 },
      custodyChain: [
        { level: 1, name: 'Evelyn Partners', type: 'Wealth Manager', resolved: true }
      ]
    },
    // POOLED PERSHING - 12% of each ETF
    {
      id: 'nom-009',
      name: 'PERSHING NOMINEES LIMITED',
      accountNumber: '',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 52739000,
      holdings: { 'IE00B4L5Y983': 15234000, 'IE00B5BMR087': 9895000, 'IE00BK5BQT80': 12542000, 'IE00B4L5YC18': 6877000, 'IE00B3RBWM25': 8191000 },
      custodyChain: [
        { level: 1, name: 'Pershing LLC', type: 'Clearing Broker', resolved: false },
        { level: 2, name: 'Charles Stanley', type: 'Wealth Manager', resolved: false }
      ]
    },
    // GLOBAL BNY POOLED - 3% of each ETF
    {
      id: 'nom-010',
      name: 'BNY MELLON NOMINEES LIMITED',
      accountNumber: '',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 13184000,
      holdings: { 'IE00B4L5Y983': 3809000, 'IE00B5BMR087': 2474000, 'IE00BK5BQT80': 3136000, 'IE00B4L5YC18': 1719000, 'IE00B3RBWM25': 2046000 },
      custodyChain: [
        { level: 1, name: 'BNY Mellon', type: 'Global Custodian', resolved: false },
        { level: 2, name: 'Caceis Bank', type: 'Regional Custodian (France)', resolved: false },
        { level: 3, name: 'Lombard Odier', type: 'Private Bank', resolved: false }
      ]
    },
    // EXECUTION AJ Bell - 2% of each ETF
    {
      id: 'nom-011',
      name: 'AJ BELL NOMINEES LIMITED',
      accountNumber: 'AJ889900',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 8790000,
      holdings: { 'IE00B4L5Y983': 2539000, 'IE00B5BMR087': 1649000, 'IE00BK5BQT80': 2090000, 'IE00B4L5YC18': 1146000, 'IE00B3RBWM25': 1366000 },
      custodyChain: [
        { level: 1, name: 'AJ Bell', type: 'Execution Platform', resolved: true }
      ]
    },
    // DEDICATED BNY 7842 - 1% of each ETF (balancing entry)
    {
      id: 'nom-012',
      name: 'BNY MELLON NOMINEES LIMITED A/C 7842',
      accountNumber: '7842',
      status: 'unmatched',
      level: 0,
      confidence: 0,
      totalShares: 4404000,
      holdings: { 
        'IE00B4L5Y983': 1270000,
        'IE00B5BMR087': 825000,
        'IE00BK5BQT80': 1046000,
        'IE00B4L5YC18': 574000,
        'IE00B3RBWM25': 689000
      },
      custodyChain: [
        { level: 1, name: 'Schroders Investment Management', type: 'Asset Manager', resolved: true }
      ]
    },
  ]
  
  // Use uploaded register nominees if available, otherwise demo data
  const defaultNominees = uploadedRegister 
    ? generateNomineesFromUpload(uploadedRegister)
    : demoNominees

  // Initialize nominees from saved state or defaults
  const [nominees, setNominees] = useState(() => {
    if (savedNominees && savedNominees.length > 0) {
      return savedNominees
    }
    return defaultNominees
  })

  // ETF state with discovered percentages - initialize from saved or defaults
  const [etfData, setEtfData] = useState(() => {
    if (savedEtfData && savedEtfData.length > 0) {
      return savedEtfData
    }
    return defaultEtfProducts.map(e => ({ ...e, identifiedPct: 0, clients: [] as { name: string; shares: number; pct: number }[] }))
  })

  // Loading animation - does NOT update context until matching starts
  useEffect(() => {
    if (phase === 'loading' && !hasStartedMatching) {
      let step = 0
      setLoadingStep(0)
      
      const interval = setInterval(() => {
        step++
        setLoadingStep(step)
        if (step >= 5) {
          clearInterval(interval)
        }
      }, 600)
      
      return () => clearInterval(interval)
    }
  }, [phase, hasStartedMatching])

  const loadingSteps = [
    'Connecting to database...',
    `Loading entity database (${knownEntities.length} known entities)...`,
    `Loading ETF products (${currentRegisterInfo.etfCount} ISINs)...`,
    `Preparing share register (${defaultNominees.length} nominees)...`,
    'Ready for analysis'
  ]

  // Helper function to match nominee name against entity database
  const matchNomineeToEntity = (nomineeName: string): KnownEntity | null => {
    const normalizedName = nomineeName.toUpperCase().trim()
    
    for (const entity of knownEntities) {
      // Check against nomineeNames (primary match)
      if (entity.nomineeNames) {
        for (const nomName of entity.nomineeNames) {
          if (normalizedName.includes(nomName.toUpperCase()) || 
              nomName.toUpperCase().includes(normalizedName)) {
            return entity
          }
        }
      }
      
      // Check against nameVariations
      if (entity.nameVariations) {
        for (const variation of entity.nameVariations) {
          if (normalizedName.includes(variation.toUpperCase()) ||
              variation.toUpperCase().includes(normalizedName.split(' ')[0])) {
            return entity
          }
        }
      }
      
      // Check against entity name
      if (normalizedName.includes(entity.name.toUpperCase()) ||
          entity.name.toUpperCase().includes(normalizedName.split(' ')[0])) {
        return entity
      }
    }
    
    return null
  }
  
  // Determine if entity is a "terminal" type (investment decision maker)
  const isTerminalEntityType = (type: string): boolean => {
    const terminalTypes = ['wealth_manager', 'platform', 'private_bank', 'asset_manager', 'robo_advisor', 'family_office', 'pension']
    return terminalTypes.includes(type)
  }

  // Start matching process
  const startMatching = async () => {
    setHasStartedMatching(true)
    setPhase('matching')
    setMatchingProgress(0)
    
    // Update context to show we've started
    if (registerId) {
      updateWorkflow(registerId, { phase: 'matching', progress: 10 })
    }
    
    // Simulate matching progress and sync to context
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 100))
      setMatchingProgress(i)
      // Update progress in context (matching phase = 10-50% of total)
      if (registerId) {
        updateWorkflow(registerId, { progress: 10 + (i * 0.4) })
      }
    }
    
    // Update nominees with match results - actually match against entity database
    const updatedNominees = nominees.map(nom => {
      // Check if already has a resolved custody chain (demo data)
      const hasDemoChain = nom.custodyChain.length === 1 && nom.custodyChain[0].resolved
      
      if (hasDemoChain) {
        return {
          ...nom,
          status: 'matched' as const,
          confidence: 100,
        }
      }
      
      // Try to match nominee name against entity database
      const matchedEntity = matchNomineeToEntity(nom.name)
      
      if (matchedEntity) {
        // Determine if this is a terminal entity (investment decision maker) or needs drilling
        const isTerminal = isTerminalEntityType(matchedEntity.type)
        
        return {
          ...nom,
          status: isTerminal ? 'matched' : 'undisclosed' as const,
          confidence: isTerminal ? 100 : 0,
          custodyChain: isTerminal 
            ? [{ level: 1, name: matchedEntity.name, type: getEntityTypeLabel(matchedEntity.type as any), resolved: true }]
            : [{ level: 1, name: matchedEntity.name, type: getEntityTypeLabel(matchedEntity.type as any), resolved: false }],
          matchedEntityId: matchedEntity.id,
          matchedEntityType: matchedEntity.type,
        }
      }
      
      // No match found - completely unknown
      return {
        ...nom,
        status: 'undisclosed' as const,
        confidence: 0,
      }
    })
    setNominees(updatedNominees)

    // Calculate discovered percentages for ETFs
    const matchedNominees = updatedNominees.filter(n => n.status === 'matched')
    
    // Build ETF data with discovered percentages
    const finalEtfData = defaultEtfProducts.map(etf => {
      const etfMatchedShares = matchedNominees.reduce((sum, n) => sum + (n.holdings[etf.isin] || 0), 0)
      // Cap at 100% to avoid rounding/data issues
      const identifiedPct = Math.min((etfMatchedShares / etf.totalShares) * 100, 100)
      const clients = matchedNominees
        .filter(n => n.holdings[etf.isin] > 0)
        .map(n => ({
          name: n.custodyChain[0].name,
          shares: n.holdings[etf.isin],
          pct: Math.min((n.holdings[etf.isin] / etf.totalShares) * 100, 100)
        }))
      const unidentifiedShares = Math.max(etf.totalShares - etfMatchedShares, 0)
      return {
        ...etf,
        identifiedPct,
        clients: [
          ...clients,
          { name: 'Unidentified', shares: unidentifiedShares, pct: Math.max((unidentifiedShares / etf.totalShares) * 100, 0) }
        ]
      }
    })
    
    setEtfData(finalEtfData)
    
    // Calculate discovered % as average across all ETFs (consistent with display)
    // Cap at 100% to avoid rounding issues
    const avgDiscoveredPct = Math.min(finalEtfData.reduce((sum, e) => sum + e.identifiedPct, 0) / finalEtfData.length, 100)
    
    // Update context with matching complete - save full state
    if (registerId) {
      updateWorkflow(registerId, { 
        phase: 'disclosure',
        progress: 50, 
        matchedCount: matchedNominees.length,
        totalCount: updatedNominees.length,
        identifiedPct: avgDiscoveredPct,
        nominees: updatedNominees,
        etfData: finalEtfData
      })
    }
    
    setPhase('disclosure')
  }

  // Send disclosure requests (batch for all undisclosed)
  const sendDisclosureRequests = () => {
    setNominees(prev => {
      const updated = prev.map(nom => {
        if (nom.status === 'undisclosed') {
          return { ...nom, status: 'awaiting-response', level: 1 }
        }
        return nom
      })
      
      // Save to context
      if (registerId) {
        updateWorkflow(registerId, { nominees: updated })
      }
      
      return updated
    })
  }

  // Send disclosure for a single nominee
  const sendDisclosureForNominee = (nomineeId: string) => {
    setNominees(prev => {
      const updated = prev.map(nom => {
        if (nom.id === nomineeId && nom.status === 'undisclosed') {
          return { ...nom, status: 'awaiting-response' }
        }
        return nom
      })
      if (registerId) {
        updateWorkflow(registerId, { nominees: updated })
      }
      return updated
    })
  }

  // Mark a nominee as having received a response (ready to add level)
  const markResponseReceived = (nomineeId: string) => {
    setNominees(prev => {
      const updated = prev.map(nom => {
        if (nom.id === nomineeId) {
          return { ...nom, status: `level-${nom.level}` }
        }
        return nom
      })
      if (registerId) {
        updateWorkflow(registerId, { nominees: updated })
      }
      return updated
    })
    setAddingLevelFor(nomineeId)
    setEntitySearch('')
    setSelectedEntity(null)
  }

  // Add a new level to a nominee's custody chain
  const addLevelToNominee = (nomineeId: string, entityName: string, entityType: string) => {
    // STRICT validation that entity name is not empty and has at least 2 characters
    const trimmedName = (entityName || '').trim()
    if (!trimmedName || trimmedName.length < 2) {
      console.error('Cannot add level: entity name must be at least 2 characters. Got:', entityName)
      alert('Error: Entity name must be at least 2 characters')
      return false // Return false to indicate failure
    }
    if (!entityType || entityType.trim().length === 0) {
      console.error('Cannot add level: entity type is required')
      alert('Error: Entity type is required')
      return false
    }
    
    setNominees(prev => {
      const updated = prev.map(nom => {
        if (nom.id === nomineeId) {
          const newLevel = nom.level + 1
          // Mark current level as resolved
          const updatedChain = nom.custodyChain.map((c, i) => ({
            ...c,
            resolved: i < newLevel
          }))
          // If we've reached a final entity type, add it to the chain if not already there
          const isTerminal = ['Wealth Manager', 'Private Bank', 'Asset Manager', 'Execution Platform', 'Pension Fund', 'Family Office', 'Institution'].includes(entityType)
          
          // Check if we need to add a new level or if we're at the last predefined level
          if (newLevel <= updatedChain.length) {
            // Update the name/type of the current level if it was "Unknown"
            updatedChain[newLevel - 1] = { ...updatedChain[newLevel - 1], name: trimmedName, type: entityType, resolved: true }
          } else {
            // Add a new level to the chain
            updatedChain.push({ level: newLevel, name: trimmedName, type: entityType, resolved: true })
          }
          
          const isFullyResolved = isTerminal
          
          return {
            ...nom,
            level: newLevel,
            status: isFullyResolved ? 'resolved' : `level-${newLevel}`,
            confidence: isFullyResolved ? 100 : Math.min(25 * newLevel, 75),
            custodyChain: updatedChain
          }
        }
        return nom
      })
      
      if (registerId) {
        updateWorkflow(registerId, { nominees: updated })
      }
      return updated
    })
    
    // Reset the adding state
    setAddingLevelFor(null)
    setEntitySearch('')
    setSelectedEntity(null)
    setShowNewEntityForm(false)
    
    // Update ETF discovered percentages
    recalculateDiscovered()
    return true
  }

  // Mark nominee as complete (investment decision maker found)
  const completeNominee = (nomineeId: string) => {
    setNominees(prev => {
      const updated = prev.map(nom => {
        if (nom.id === nomineeId) {
          // Mark all levels as resolved
          const updatedChain = nom.custodyChain.map(c => ({ ...c, resolved: true }))
          return {
            ...nom,
            status: 'resolved',
            confidence: 100,
            custodyChain: updatedChain
          }
        }
        return nom
      })
      
      if (registerId) {
        updateWorkflow(registerId, { nominees: updated })
      }
      return updated
    })
    
    recalculateDiscovered()
  }

  // Delete a level from a nominee's custody chain
  const deleteLevelFromNominee = (nomineeId: string, levelIndex: number) => {
    setNominees(prev => {
      const updated = prev.map(nom => {
        if (nom.id === nomineeId) {
          const newChain = nom.custodyChain.filter((_, idx) => idx !== levelIndex)
          // Renumber levels
          const renumberedChain = newChain.map((c, idx) => ({ ...c, level: idx + 1 }))
          return {
            ...nom,
            custodyChain: renumberedChain,
            level: renumberedChain.length
          }
        }
        return nom
      })
      
      if (registerId) {
        updateWorkflow(registerId, { nominees: updated })
      }
      return updated
    })
    recalculateDiscovered()
  }

  // Add node to tree (child or sibling)
  const addNodeToTree = () => {
    if (!addNodeContext || !newNodeName.trim()) return
    
    const { nomineeId, parentNodeId, mode } = addNodeContext
    
    const newNode: TreeNode = {
      id: `node-${Date.now()}`,
      name: newNodeName.trim(),
      type: newNodeType,
      level: parentNodeId ? 1 : 1, // Will be calculated properly
      holdings: { ...newNodeHoldings },
      isTerminal: newNodeIsTerminal,
      children: []
    }
    
    setNominees(prev => {
      const updated = prev.map(nom => {
        if (nom.id !== nomineeId || !nom.tree) return nom
        
        // Deep clone the tree
        const cloneTree = (node: TreeNode): TreeNode => ({
          ...node,
          children: node.children.map(cloneTree)
        })
        const newTree = cloneTree(nom.tree)
        
        // Find parent and add child
        const addToParent = (node: TreeNode): boolean => {
          if (node.id === parentNodeId) {
            newNode.level = node.level + 1
            node.children.push(newNode)
            node.isTerminal = false
            return true
          }
          for (const child of node.children) {
            if (addToParent(child)) return true
          }
          return false
        }
        
        if (parentNodeId) {
          addToParent(newTree)
        } else {
          // Adding to root level
          newNode.level = 1
          newTree.children.push(newNode)
          newTree.isTerminal = false
        }
        
        // Check if all terminal nodes are complete
        const checkAllTerminal = (node: TreeNode): boolean => {
          if (node.children.length === 0) return node.isTerminal
          return node.children.every(checkAllTerminal)
        }
        const allComplete = checkAllTerminal(newTree)
        
        return {
          ...nom,
          tree: newTree,
          status: allComplete ? 'resolved' : `level-${newNode.level}`,
          confidence: allComplete ? 100 : 0
        }
      })
      
      if (registerId) {
        updateWorkflow(registerId, { nominees: updated })
      }
      return updated
    })
    
    // Close modal
    setShowAddNodeModal(false)
    setAddNodeContext(null)
    recalculateDiscovered()
  }
  
  // Delete node from tree
  const deleteNodeFromTree = (nomineeId: string, nodeId: string) => {
    setNominees(prev => {
      const updated = prev.map(nom => {
        if (nom.id !== nomineeId || !nom.tree) return nom
        
        // Can't delete root
        if (nom.tree.id === nodeId) return nom
        
        // Deep clone and filter
        const cloneAndFilter = (node: TreeNode): TreeNode => ({
          ...node,
          children: node.children.filter(c => c.id !== nodeId).map(cloneAndFilter)
        })
        const newTree = cloneAndFilter(nom.tree)
        
        return { ...nom, tree: newTree }
      })
      
      if (registerId) {
        updateWorkflow(registerId, { nominees: updated })
      }
      return updated
    })
    recalculateDiscovered()
  }
  
  // Mark node as terminal (investment decision maker found)
  const markNodeTerminal = (nomineeId: string, nodeId: string) => {
    setNominees(prev => {
      const updated = prev.map(nom => {
        if (nom.id !== nomineeId || !nom.tree) return nom
        
        const cloneAndMark = (node: TreeNode): TreeNode => {
          if (node.id === nodeId) {
            return { ...node, isTerminal: true }
          }
          return { ...node, children: node.children.map(cloneAndMark) }
        }
        const newTree = cloneAndMark(nom.tree)
        
        // Check if all leaf nodes are terminal
        const checkAllTerminal = (node: TreeNode): boolean => {
          if (node.children.length === 0) return node.isTerminal
          return node.children.every(checkAllTerminal)
        }
        const allComplete = checkAllTerminal(newTree)
        
        return {
          ...nom,
          tree: newTree,
          status: allComplete ? 'resolved' : nom.status,
          confidence: allComplete ? 100 : nom.confidence
        }
      })
      
      if (registerId) {
        updateWorkflow(registerId, { nominees: updated })
      }
      return updated
    })
    recalculateDiscovered()
  }

  // Recalculate discovered percentages after changes
  // Helper to get all terminal nodes from a tree
  const getTerminalNodes = (tree: TreeNode): TreeNode[] => {
    const terminals: TreeNode[] = []
    const traverse = (node: TreeNode) => {
      if (node.isTerminal && node.children.length === 0) {
        terminals.push(node)
      }
      for (const child of node.children) {
        traverse(child)
      }
    }
    traverse(tree)
    return terminals
  }

  const recalculateDiscovered = () => {
    setTimeout(() => {
      setNominees(currentNominees => {
        const resolvedNominees = currentNominees.filter(n => 
          n.status === 'matched' || n.status === 'resolved'
        )
        
        const newEtfData = defaultEtfProducts.map(etf => {
          // Calculate discovered shares - handle both tree structure and linear chains
          let discoveredShares = 0
          const clientsList: { name: string; shares: number; pct: number }[] = []
          
          for (const nominee of resolvedNominees) {
            if (nominee.tree && nominee.tree.children.length > 0) {
              // Has tree - get shares from terminal nodes
              const terminalNodes = getTerminalNodes(nominee.tree)
              for (const node of terminalNodes) {
                const shares = node.holdings[etf.isin] || 0
                if (shares > 0) {
                  discoveredShares += shares
                  clientsList.push({
                    name: node.name,
                    shares: shares,
                    pct: Math.min((shares / etf.totalShares) * 100, 100)
                  })
                }
              }
            } else {
              // No tree - use direct holdings (linear chain or simple match)
              const shares = nominee.holdings[etf.isin] || 0
              if (shares > 0) {
                discoveredShares += shares
                clientsList.push({
                  name: nominee.custodyChain[nominee.custodyChain.length - 1]?.name || nominee.name,
                  shares: shares,
                  pct: Math.min((shares / etf.totalShares) * 100, 100)
                })
              }
            }
          }
          
          // Cap at 100% to avoid rounding/data issues
          const identifiedPct = Math.min((discoveredShares / etf.totalShares) * 100, 100)
          const unidentifiedShares = Math.max(etf.totalShares - discoveredShares, 0)
          
          return { 
            ...etf, 
            identifiedPct,
            clients: [
              ...clientsList,
              { name: 'Unidentified', shares: unidentifiedShares, pct: Math.max((unidentifiedShares / etf.totalShares) * 100, 0) }
            ]
          }
        })
        
        setEtfData(newEtfData)
        
        // Cap average at 100% as well
        const avgDiscoveredPct = Math.min(newEtfData.reduce((sum, e) => sum + e.identifiedPct, 0) / newEtfData.length, 100)
        const resolvedCount = currentNominees.filter(n => n.status === 'matched' || n.status === 'resolved').length
        
        if (registerId) {
          updateWorkflow(registerId, { 
            identifiedPct: avgDiscoveredPct,
            matchedCount: resolvedCount,
            etfData: newEtfData
          })
        }
        
        return currentNominees
      })
    }, 100)
  }

  // Get searchable entity suggestions
  const getEntitySuggestions = () => {
    if (!entitySearch) return []
    const search = entitySearch.toLowerCase()
    return knownEntities
      .filter(e => 
        e.name.toLowerCase().includes(search) ||
        e.nomineeNames.some(n => n.toLowerCase().includes(search)) ||
        e.type.toLowerCase().includes(search)
      )
      .slice(0, 10)
      .map(e => ({
        id: e.id,
        name: e.name,
        type: getEntityTypeLabel(e.type),
        rawType: e.type
      }))
  }

  // Legacy: Simulate receiving disclosure response (kept for backward compatibility)
  const receiveResponse = (nomineeId: string) => {
    let newResolvedCount = 0
    
    setNominees(prev => {
      const updated = prev.map(nom => {
        if (nom.id === nomineeId) {
          const currentLevel = nom.level
          const maxLevel = nom.custodyChain.length
          const newLevel = Math.min(currentLevel + 1, maxLevel)
          const isResolved = newLevel >= maxLevel
          
          // Update custody chain resolved status
          const updatedChain = nom.custodyChain.map((c, i) => ({
            ...c,
            resolved: i < newLevel
          }))
          
          return {
            ...nom,
            level: newLevel,
            status: isResolved ? 'resolved' : `level-${newLevel}`,
            confidence: isResolved ? 100 : Math.min(25 * newLevel, 75),
            custodyChain: updatedChain
          }
        }
        return nom
      })
      
      // Calculate new resolved count
      newResolvedCount = updated.filter(n => n.status === 'matched' || n.status === 'resolved').length
      
      // Progress increases as more nominees are resolved (50-90%)
      const progress = 50 + ((newResolvedCount / updated.length) * 40)
      
      // We'll calculate identifiedPct after updating ETF data
      if (registerId) {
        updateWorkflow(registerId, { 
          progress, 
          matchedCount: newResolvedCount,
          nominees: updated
        })
      }
      
      return updated
    })

    // Update ETF discovered percentages
    setTimeout(() => {
      setNominees(currentNominees => {
        const resolvedNominees = currentNominees.filter(n => 
          n.status === 'matched' || n.status === 'resolved'
        )
        
        const newEtfData = defaultEtfProducts.map(etf => {
          const discoveredShares = resolvedNominees.reduce((sum, n) => sum + (n.holdings[etf.isin] || 0), 0)
          // Cap at 100% to avoid rounding/data issues
          const identifiedPct = Math.min((discoveredShares / etf.totalShares) * 100, 100)
          
          // Update clients list
          const clients = resolvedNominees
            .filter(n => n.holdings[etf.isin] > 0)
            .map(n => ({
              name: n.custodyChain[n.custodyChain.length - 1]?.name || n.name,
              shares: n.holdings[etf.isin],
              pct: Math.min((n.holdings[etf.isin] / etf.totalShares) * 100, 100)
            }))
          const unidentifiedShares = Math.max(etf.totalShares - discoveredShares, 0)
          
          return { 
            ...etf, 
            identifiedPct,
            clients: [
              ...clients,
              { name: 'Unidentified', shares: unidentifiedShares, pct: Math.max((unidentifiedShares / etf.totalShares) * 100, 0) }
            ]
          }
        })
        
        setEtfData(newEtfData)
        
        // Calculate identifiedPct as average across all ETFs (same as display), capped at 100
        const avgDiscoveredPct = Math.min(newEtfData.reduce((sum, e) => sum + e.identifiedPct, 0) / newEtfData.length, 100)
        
        // Save ETF data and updated identifiedPct to context
        if (registerId) {
          updateWorkflow(registerId, { 
            etfData: newEtfData,
            identifiedPct: avgDiscoveredPct
          })
        }
        
        return currentNominees
      })
    }, 100)
  }
  
  // Deliver report to issuer
  const deliverToIssuer = () => {
    if (registerId) {
      // Calculate discovered % as average across all ETFs (consistent with display)
      const avgDiscoveredPct = etfData.reduce((sum, e) => sum + e.identifiedPct, 0) / etfData.length
      
      updateWorkflow(registerId, { 
        phase: 'delivered', 
        progress: 100,
        identifiedPct: avgDiscoveredPct,
        nominees,
        etfData
      })
    }
    setPhase('complete')
    navigate('/analysis')
  }

  const toggleNominee = (id: string) => {
    setExpandedNominees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  const toggleETF = (isin: string) => {
    setExpandedETFs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(isin)) newSet.delete(isin)
      else newSet.add(isin)
      return newSet
    })
  }

  const getStatusBadge = (status: string) => {
    if (status === 'matched') return { bg: 'bg-accent-500/20', text: 'text-accent-400', label: 'Matched' }
    if (status === 'resolved') return { bg: 'bg-accent-500/20', text: 'text-accent-400', label: 'Resolved' }
    if (status === 'undisclosed') return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Undisclosed' }
    if (status === 'awaiting-response') return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Awaiting Response' }
    if (status.startsWith('level-')) return { bg: 'bg-purple-500/20', text: 'text-purple-400', label: status.replace('-', ' ').toUpperCase() }
    return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status }
  }

  // Sort nominees: undisclosed/awaiting/level-X at top, matched at bottom
  const sortedNominees = [...nominees].sort((a, b) => {
    const aMatched = a.status === 'matched' || a.status === 'resolved'
    const bMatched = b.status === 'matched' || b.status === 'resolved'
    if (aMatched && !bMatched) return 1
    if (!aMatched && bMatched) return -1
    // Sort by status priority within unmatched
    const statusPriority = (s: string) => {
      if (s === 'undisclosed') return 0
      if (s === 'awaiting-response') return 1
      if (s.startsWith('level-')) return 2
      return 3
    }
    return statusPriority(a.status) - statusPriority(b.status)
  })

  const matchedCount = nominees.filter(n => n.status === 'matched' || n.status === 'resolved').length
  const undisclosedCount = nominees.filter(n => n.status === 'undisclosed' || n.status === 'awaiting-response' || n.status.startsWith('level-')).length
  const awaitingCount = nominees.filter(n => n.status === 'awaiting-response').length
  const totalDiscoveredPct = etfData.reduce((sum, e) => sum + e.identifiedPct, 0) / etfData.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate('/analysis/workflows')}
            className="text-sm text-gray-400 hover:text-white mb-2 flex items-center gap-1"
          >
            ← Back to Workflows
          </button>
          
          {/* Register Dropdown */}
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{currentRegisterInfo.issuerName} Share Register</h2>
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
                <span className="text-sm text-gray-400">
                  {new Date(currentRegisterInfo.uploadDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 mt-2 w-80 bg-dark-800 border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-2">
                  <div className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2">Open</div>
                  {Object.entries(workflows)
                    .filter(([_, w]) => w.progress > 0 && w.phase !== 'delivered')
                    .map(([id, w]) => {
                      const info = registerMetadata[id] || { issuerName: 'Unknown', uploadDate: '', issuerLogo: '?', etfCount: 0, totalHolders: 0 }
                      return (
                        <button
                          key={id}
                          onClick={() => navigate(`/analysis/workflows/${id}`)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors ${
                            id === registerId ? 'bg-primary-500/10 border border-primary-500/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <div className="text-left">
                              <div className="text-sm text-white">{info.issuerName} Share Register</div>
                              <div className="text-xs text-gray-500">
                                {new Date(info.uploadDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-accent-400">{(w.identifiedPct || 0).toFixed(1)}%</span>
                        </button>
                      )
                    })}
                  
                  {Object.entries(workflows).filter(([_, w]) => w.progress > 0 && w.phase === 'delivered').length > 0 && (
                    <>
                      <div className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 mt-2 border-t border-white/5">Closed & Sent</div>
                      {Object.entries(workflows)
                        .filter(([_, w]) => w.progress > 0 && w.phase === 'delivered')
                        .map(([id, w]) => {
                          const info = registerMetadata[id] || { issuerName: 'Unknown', uploadDate: '', issuerLogo: '?', etfCount: 0, totalHolders: 0 }
                          return (
                            <button
                              key={id}
                              onClick={() => navigate(`/analysis/workflows/${id}`)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors ${
                                id === registerId ? 'bg-accent-500/10 border border-accent-500/30' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <CheckCircle className="w-4 h-4 text-accent-400" />
                                <div className="text-left">
                                  <div className="text-sm text-white">{info.issuerName} Share Register</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(info.uploadDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-accent-400">{calculateTrueIdentifiedPct(w).toFixed(1)}%</span>
                            </button>
                          )
                        })}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p className="text-gray-400 mt-1">
            {currentRegisterInfo.etfCount} ETF Products • {currentRegisterInfo.totalHolders} Nominee Accounts • Uploaded: {new Date(currentRegisterInfo.uploadDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {phase === 'disclosure' && (
            <>
              <button className="btn-secondary flex items-center gap-2">
                <Pause className="w-4 h-4" /> Pause
              </button>
              <button 
                onClick={deliverToIssuer}
                className="btn-primary flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Deliver to Issuer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading Phase */}
      {phase === 'loading' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-glass rounded-xl p-8"
        >
          <div className="max-w-xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Database className="w-6 h-6 text-primary-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Initializing Analysis</h3>
                <p className="text-gray-400 text-sm">Preparing your share register for analysis</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {loadingSteps.map((step, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: loadingStep >= i ? 1 : 0.3, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  {loadingStep > i ? (
                    <CheckCircle className="w-5 h-5 text-accent-400" />
                  ) : loadingStep === i ? (
                    <RefreshCw className="w-5 h-5 text-primary-400 animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                  )}
                  <span className={loadingStep >= i ? 'text-white' : 'text-gray-500'}>{step}</span>
                </motion.div>
              ))}
            </div>

            {loadingStep >= loadingSteps.length && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-center"
              >
                <button 
                  onClick={startMatching}
                  className="btn-primary px-8 py-3 text-lg flex items-center gap-3 mx-auto"
                >
                  <Target className="w-5 h-5" /> Start Entity Matching
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Matching Phase */}
      {phase === 'matching' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-glass rounded-xl p-8"
        >
          <div className="max-w-xl mx-auto text-center">
            <RefreshCw className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Matching Entities...</h3>
            <p className="text-gray-400 mb-6">Cross-referencing nominees against 2,847 known entities</p>
            
            <div className="bg-dark-800 rounded-full h-4 overflow-hidden mb-4">
              <motion.div 
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                initial={{ width: 0 }}
                animate={{ width: `${matchingProgress}%` }}
              />
            </div>
            <span className="text-white font-medium">{matchingProgress}%</span>
          </div>
        </motion.div>
      )}

      {/* Disclosure Phase - Main Analysis View */}
      {phase === 'disclosure' && (
        <>
          {/* Summary Bar */}
          <div className="card-glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-accent-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{matchedCount}</div>
                    <div className="text-xs text-gray-500">Matched</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{undisclosedCount}</div>
                    <div className="text-xs text-gray-500">Pending Disclosure</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{totalDiscoveredPct.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">Avg. Identified</div>
                  </div>
                </div>
              </div>
              <button 
                onClick={sendDisclosureRequests}
                className="btn-primary flex items-center gap-2"
                disabled={!nominees.some(n => n.status === 'undisclosed')}
              >
                <Send className="w-4 h-4" /> Send Disclosure Requests
              </button>
            </div>
          </div>

          {/* ETF Discovery Summary Bar */}
          <div className="card-glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent-400" />
                ETF Discovery Progress
              </div>
              <div className="text-xs text-gray-500">{etfData.length} products</div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {etfData.map(etf => {
                // Show first 2-3 words or up to 25 chars for better ETF name display
                const shortName = etf.name.split(' ').slice(0, 3).join(' ')
                const displayName = shortName.length > 28 ? shortName.substring(0, 25) + '...' : shortName
                
                return (
                  <div key={etf.isin} className="bg-dark-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 truncate mb-1 leading-tight" title={etf.name}>
                      {displayName}
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-500">{etf.isin.slice(-4)}</span>
                      <span className={`text-sm font-bold ${etf.identifiedPct > 50 ? 'text-accent-400' : 'text-yellow-400'}`}>
                        {etf.identifiedPct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${etf.identifiedPct > 50 ? 'bg-accent-500' : 'bg-yellow-500'}`}
                        style={{ width: `${Math.min(etf.identifiedPct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Nominees Section */}
          <div>
            {/* Nominees Box */}
            <div className="card-glass rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-dark-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary-400" />
                    Nominee Accounts
                  </h3>
                  <span className="text-sm text-gray-400">{nominees.length} accounts</span>
                </div>
              </div>
              
              <div className="max-h-[600px] overflow-y-auto">
                {sortedNominees.map((nominee) => {
                  const isExpanded = expandedNominees.has(nominee.id)
                  const statusStyle = getStatusBadge(nominee.status)
                  const isMatched = nominee.status === 'matched' || nominee.status === 'resolved'
                  
                  return (
                    <div key={nominee.id} className={`border-b border-white/5 last:border-0 ${isMatched ? 'bg-dark-800/20' : ''}`}>
                      {/* Nominee Row */}
                      <div 
                        className="p-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                        onClick={() => toggleNominee(nominee.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button className="w-6 h-6 rounded bg-dark-700 hover:bg-dark-600 flex items-center justify-center">
                              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                            <div>
                              <div className="text-sm font-medium text-white">{nominee.name}</div>
                              <div className="text-xs text-gray-500 font-mono">{nominee.accountNumber}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm text-white">{(nominee.totalShares / 1e6).toFixed(1)}M</div>
                              <div className="text-xs text-gray-500">shares</div>
                            </div>
                            {nominee.confidence > 0 && (
                              <div className="text-right w-16">
                                <div className="text-xs text-gray-500 mb-1">Conf.</div>
                                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${nominee.confidence === 100 ? 'bg-accent-500' : 'bg-yellow-500'}`}
                                    style={{ width: `${nominee.confidence}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              {statusStyle.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-dark-800/50 border-t border-white/5"
                          >
                            <div className="p-4 pl-10 space-y-4">
                              {/* ETF Holdings Table */}
                              <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Holdings by ETF</div>
                                <div className="bg-dark-700/50 rounded-lg overflow-hidden">
                                  <div className="grid grid-cols-6 gap-2 p-2 bg-dark-700 text-xs text-gray-400 font-medium">
                                    <div className="col-span-2">ETF</div>
                                    <div className="text-right">ISIN</div>
                                    <div className="text-right">Shares</div>
                                    <div className="text-right">Value (M)</div>
                                    <div className="text-right">% of ETF</div>
                                  </div>
                                  {defaultEtfProducts.map(etf => {
                                    const shares = nominee.holdings[etf.isin] || 0
                                    const pct = etf.totalShares > 0 ? (shares / etf.totalShares) * 100 : 0
                                    return (
                                      <div key={etf.isin} className="grid grid-cols-6 gap-2 p-2 border-t border-white/5 text-sm">
                                        <div className="col-span-2 text-white truncate" title={etf.name}>{etf.name}</div>
                                        <div className="text-right text-gray-500 font-mono text-xs">{etf.isin.slice(-6)}</div>
                                        <div className="text-right text-white">{shares > 0 ? (shares / 1e6).toFixed(2) + 'M' : '-'}</div>
                                        <div className="text-right text-gray-400">{shares > 0 ? '€' + ((shares * 25) / 1e6).toFixed(1) + 'M' : '-'}</div>
                                        <div className="text-right">
                                          {shares > 0 ? (
                                            <span className={pct > 5 ? 'text-accent-400' : 'text-gray-400'}>{pct.toFixed(2)}%</span>
                                          ) : (
                                            <span className="text-gray-600">-</span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                  <div className="grid grid-cols-6 gap-2 p-2 border-t border-white/10 bg-dark-700/50 text-sm font-medium">
                                    <div className="col-span-2 text-gray-400">Total</div>
                                    <div></div>
                                    <div className="text-right text-white">{(nominee.totalShares / 1e6).toFixed(2)}M</div>
                                    <div className="text-right text-gray-400">€{((nominee.totalShares * 25) / 1e6).toFixed(1)}M</div>
                                    <div></div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Custody Chain Section */}
                              <div>
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-xs text-gray-500 uppercase tracking-wider">Ownership Tree</div>
                                {nominee.status === 'undisclosed' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); sendDisclosureForNominee(nominee.id); }}
                                    className="text-xs bg-primary-500 text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-1.5"
                                  >
                                    <Send className="w-3 h-3" /> Send Disclosure Request
                                  </button>
                                )}
                                {nominee.status === 'awaiting-response' && !nominee.tree && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); initializeTree(nominee.id); }}
                                    className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg hover:bg-yellow-500/30 transition-colors flex items-center gap-1.5"
                                  >
                                    <Mail className="w-3 h-3" /> Response Received - Build Tree
                                  </button>
                                )}
                              </div>
                              
                              <div className="space-y-4">
                                {/* Empty state for undisclosed nominees */}
                                {nominee.status === 'undisclosed' && (
                                  <div className="p-4 bg-dark-700/30 rounded-lg border border-dashed border-gray-600 text-center">
                                    <div className="text-gray-500 text-sm">
                                      Send disclosure request to discover custody chain
                                    </div>
                                  </div>
                                )}
                                
                                {/* Awaiting response state - ready to build tree */}
                                {nominee.status === 'awaiting-response' && !nominee.tree && (
                                  <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                                    <div className="text-yellow-400 text-sm mb-3 text-center">
                                      Disclosure response received. Build the ownership tree to map the custody chain.
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                      <motion.button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          // Open full view - it will initialize the tree automatically
                                          openFullTreeView(nominee.id)
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <Maximize2 className="w-4 h-4" />
                                        Build Tree (Full View)
                                      </motion.button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          initializeTree(nominee.id)
                                        }}
                                        className="text-xs text-gray-400 hover:text-white px-3 py-2 rounded hover:bg-white/5"
                                      >
                                        Build Inline
                                      </button>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Render tree if nominee has one */}
                                {nominee.tree && (
                                  <div className="relative">
                                    {/* Full Tree View Button */}
                                    <div className="absolute top-0 right-0 z-10">
                                      <motion.button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openFullTreeView(nominee.id)
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-medium rounded-lg shadow-lg hover:shadow-xl transition-all"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <Maximize2 className="w-4 h-4" />
                                        View Full Tree
                                      </motion.button>
                                    </div>
                                    
                                    {/* Root Node (Level 0 - the nominee itself) */}
                                    <div className="mb-4 p-4 bg-dark-700 rounded-lg border border-primary-500/30">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
                                            <span className="text-sm text-white font-bold">L0</span>
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium text-white">{nominee.tree.name}</div>
                                            <div className="text-xs text-gray-500">Level 0 - Nominee Account</div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm text-white">{(nominee.totalShares / 1e6).toFixed(2)}M shares</div>
                                        </div>
                                      </div>
                                      
                                      {/* Holdings summary */}
                                      <div className="mt-3 pt-3 border-t border-white/10">
                                        <div className="grid grid-cols-5 gap-2 text-center">
                                          {defaultEtfProducts.map(etf => (
                                            <div key={etf.isin}>
                                              <div className="text-xs text-gray-500">{etf.isin.slice(-4)}</div>
                                              <div className="text-sm text-white font-medium">
                                                {((nominee.holdings[etf.isin] || 0) / 1e6).toFixed(2)}M
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      {/* Add first child button */}
                                      {nominee.tree.children.length === 0 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            openAddNodeModal(nominee.id, nominee.tree!.id, 'child')
                                          }}
                                          className="mt-3 w-full text-sm bg-primary-500/20 text-primary-400 px-3 py-2 rounded-lg hover:bg-primary-500/30 transition-colors flex items-center justify-center gap-2"
                                        >
                                          <ChevronDown className="w-4 h-4" /> Add First Level (Child)
                                        </button>
                                      )}
                                    </div>
                                    
                                    {/* Children tree */}
                                    {nominee.tree.children.length > 0 && (
                                      <div className="ml-8 pl-4 border-l-2 border-primary-500/30 space-y-3">
                                        {/* Remaining shares indicator at Level 1 */}
                                        <div className="bg-dark-700/30 rounded p-2 mb-2">
                                          <div className="text-xs text-gray-500 mb-1">Remaining at Level 1:</div>
                                          <div className="grid grid-cols-5 gap-1 text-center">
                                            {defaultEtfProducts.map(etf => {
                                              const total = nominee.holdings[etf.isin] || 0
                                              const allocated = nominee.tree!.children.reduce((sum, c) => sum + (c.holdings[etf.isin] || 0), 0)
                                              const remaining = total - allocated
                                              const isFullyAllocated = remaining < 1000
                                              return (
                                                <div key={etf.isin}>
                                                  <div className="text-xs text-gray-500">{etf.isin.slice(-4)}</div>
                                                  <div className={`text-xs font-medium ${isFullyAllocated ? 'text-accent-400' : 'text-yellow-400'}`}>
                                                    {isFullyAllocated ? '✓' : (remaining / 1e6).toFixed(2) + 'M'}
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                        
                                        {/* Child nodes */}
                                        {nominee.tree.children.map((child, idx) => {
                                          const childrenHoldings = nominee.tree!.children.reduce((acc, c) => {
                                            defaultEtfProducts.forEach(etf => {
                                              acc[etf.isin] = (acc[etf.isin] || 0) + (c.holdings[etf.isin] || 0)
                                            })
                                            return acc
                                          }, {} as Record<string, number>)
                                          
                                          return (
                                            <TreeNodeView
                                              key={child.id}
                                              node={child}
                                              parentHoldings={nominee.holdings}
                                              siblingHoldings={childrenHoldings}
                                              etfProducts={defaultEtfProducts}
                                              onAddChild={(parentId) => openAddNodeModal(nominee.id, parentId, 'child')}
                                              onAddSibling={(nodeId, parentId) => openAddNodeModal(nominee.id, parentId || nominee.tree!.id, 'sibling', nodeId)}
                                              onDelete={(nodeId) => deleteNodeFromTree(nominee.id, nodeId)}
                                              onMarkTerminal={(nodeId) => markNodeTerminal(nominee.id, nodeId)}
                                              parentId={nominee.tree!.id}
                                              isLastSibling={idx === nominee.tree!.children.length - 1}
                                            />
                                          )
                                        })}
                                        
                                        {/* Add sibling button if shares remaining */}
                                        {(() => {
                                          const hasRemaining = defaultEtfProducts.some(etf => {
                                            const total = nominee.holdings[etf.isin] || 0
                                            const allocated = nominee.tree!.children.reduce((sum, c) => sum + (c.holdings[etf.isin] || 0), 0)
                                            return (total - allocated) > 1000
                                          })
                                          if (hasRemaining) {
                                            return (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  openAddNodeModal(nominee.id, nominee.tree!.id, 'sibling')
                                                }}
                                                className="text-xs bg-purple-500/20 text-purple-400 px-3 py-2 rounded hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                                              >
                                                <Plus className="w-3 h-3" /> Add Sibling at Level 1
                                              </button>
                                            )
                                          }
                                          return null
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Matched nominees (simple case) */}
                                {nominee.status === 'matched' && !nominee.tree && (
                                  <div className="p-4 bg-accent-500/10 rounded-lg border border-accent-500/30">
                                    <div className="flex items-center gap-3">
                                      <CheckCircle className="w-5 h-5 text-accent-400" />
                                      <div>
                                        <div className="text-sm text-white font-medium">
                                          {nominee.custodyChain[0]?.name || 'Direct Match'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {nominee.custodyChain[0]?.type || 'Investment Decision Maker'} - 100% Confidence
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Resolved tree indicator */}
                                {nominee.status === 'resolved' && nominee.tree && (
                                  <div className="mt-3 p-3 bg-accent-500/10 border border-accent-500/30 rounded-lg">
                                    <div className="flex items-center gap-2 text-accent-400 text-sm">
                                      <CheckCircle className="w-4 h-4" />
                                      All investment decision makers identified
                                    </div>
                                  </div>
                                )}
                              </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </>
      )}

      {/* Complete Phase - Delivered Analysis View */}
      {phase === 'complete' && (
        <>
          {/* Success Banner */}
          <div className="card-glass rounded-xl p-6 bg-gradient-to-r from-accent-500/10 to-primary-500/10 border border-accent-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-accent-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-accent-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Analysis Complete</h2>
                  <p className="text-gray-400">
                    {currentRegisterInfo.issuerName} Share Register - {new Date(currentRegisterInfo.uploadDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-3xl font-bold text-accent-400">{totalDiscoveredPct.toFixed(1)}%</div>
                  <div className="text-sm text-gray-500">Ownership Identified</div>
                </div>
                <button 
                  onClick={() => navigate(`/issuer/reports/${registerId}`)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> View Report
                </button>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card-glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{nominees.filter(n => n.status === 'matched' || n.status === 'resolved').length}</div>
                  <div className="text-xs text-gray-500">Resolved Nominees</div>
                </div>
              </div>
            </div>
            <div className="card-glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{nominees.filter(n => n.tree && n.tree.children && n.tree.children.length > 0).length}</div>
                  <div className="text-xs text-gray-500">With Custody Trees</div>
                </div>
              </div>
            </div>
            <div className="card-glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{etfData.length}</div>
                  <div className="text-xs text-gray-500">ETF Products</div>
                </div>
              </div>
            </div>
            <div className="card-glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{nominees.length}</div>
                  <div className="text-xs text-gray-500">Total Holders</div>
                </div>
              </div>
            </div>
          </div>

          {/* ETF Discovery Results */}
          <div className="card-glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent-400" />
                ETF Discovery Results
              </h3>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {etfData.map(etf => {
                const shortName = etf.name.split(' ').slice(0, 3).join(' ')
                const displayName = shortName.length > 28 ? shortName.substring(0, 25) + '...' : shortName
                
                return (
                  <div key={etf.isin} className="bg-dark-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 truncate mb-1 leading-tight" title={etf.name}>
                      {displayName}
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-500">{etf.isin.slice(-4)}</span>
                      <span className="text-sm font-bold text-accent-400">
                        {(etf.identifiedPct || 0).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent-500 transition-all duration-500"
                        style={{ width: `${Math.min(etf.identifiedPct || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Resolved Nominees with Trees */}
          <div className="card-glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-dark-800/50">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-400" />
                Ownership Structure ({nominees.length} nominees)
              </h3>
            </div>
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {nominees.map((nominee) => {
                const isExpanded = expandedNominees.has(nominee.id)
                const hasTree = nominee.tree && nominee.tree.children && nominee.tree.children.length > 0
                
                return (
                  <div key={nominee.id} className="bg-dark-800/30">
                    <div 
                      className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer"
                      onClick={() => {
                        const newSet = new Set(expandedNominees)
                        if (newSet.has(nominee.id)) {
                          newSet.delete(nominee.id)
                        } else {
                          newSet.add(nominee.id)
                        }
                        setExpandedNominees(newSet)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <button className="w-6 h-6 rounded bg-dark-600 flex items-center justify-center">
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                        <div className={`w-2 h-2 rounded-full ${hasTree ? 'bg-accent-400' : 'bg-gray-500'}`} />
                        <div>
                          <div className="text-white font-medium">{nominee.name}</div>
                          <div className="text-xs text-gray-500">
                            {nominee.type || 'Nominee'} • {(nominee.totalShares / 1e6).toFixed(2)}M shares
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {hasTree && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openFullTreeView(nominee.id)
                            }}
                            className="px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded-lg text-xs font-medium hover:bg-primary-500/30 flex items-center gap-1"
                          >
                            <Maximize2 className="w-3 h-3" /> View Tree
                          </button>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          hasTree ? 'bg-accent-500/20 text-accent-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {hasTree ? 'Resolved' : 'Terminal'}
                        </span>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        {/* Holdings Table */}
                        <div className="bg-dark-700/50 rounded-lg p-3 mb-3">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">ETF Holdings</div>
                          <div className="grid grid-cols-5 gap-2">
                            {etfData.map(etf => {
                              const shares = nominee.holdings?.[etf.isin] || 0
                              if (shares === 0) return null
                              return (
                                <div key={etf.isin} className="text-center p-2 bg-dark-600/50 rounded">
                                  <div className="text-xs text-gray-500">{etf.isin.slice(-4)}</div>
                                  <div className="text-sm font-medium text-white">{(shares / 1e6).toFixed(2)}M</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        
                        {/* Investment Decision Makers - Collect ALL terminal nodes from tree */}
                        {hasTree && (() => {
                          // Recursively collect all terminal nodes (investment decision makers)
                          const collectTerminalNodes = (node: any): any[] => {
                            if (node.isTerminal || node.children.length === 0) {
                              return [node]
                            }
                            return node.children.flatMap(collectTerminalNodes)
                          }
                          
                          const terminalNodes = nominee.tree.children.flatMap(collectTerminalNodes)
                          
                          // Also collect intermediary custodians (non-terminal with children)
                          const collectIntermediaries = (node: any, depth: number = 0): any[] => {
                            if (node.isTerminal || node.children.length === 0) return []
                            const result: any[] = [{ ...node, depth }]
                            node.children.forEach((child: any) => {
                              result.push(...collectIntermediaries(child, depth + 1))
                            })
                            return result
                          }
                          const intermediaries = nominee.tree.children.flatMap((child: any) => collectIntermediaries(child, 1))
                          
                          return (
                            <>
                              {/* Custody Layers Summary */}
                              {intermediaries.length > 0 && (
                                <div className="bg-dark-700/50 rounded-lg p-3 mb-3">
                                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                                    Custody Structure ({intermediaries.length} intermediaries)
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {intermediaries.slice(0, 6).map((node: any, idx: number) => (
                                      <div 
                                        key={node.id || idx} 
                                        className="px-2 py-1 bg-dark-600 rounded text-xs flex items-center gap-1"
                                      >
                                        <span className="text-yellow-400">L{node.depth}</span>
                                        <span className="text-white">{node.name}</span>
                                        <span className="text-gray-500">({node.type})</span>
                                      </div>
                                    ))}
                                    {intermediaries.length > 6 && (
                                      <div className="px-2 py-1 text-xs text-gray-500">
                                        +{intermediaries.length - 6} more
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Investment Decision Makers */}
                              <div className="bg-dark-700/50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                                  Investment Decision Makers ({terminalNodes.length})
                                </div>
                                <div className="space-y-2">
                                  {terminalNodes.slice(0, 8).map((node: any, idx: number) => {
                                    const nodeShares = Object.values(node.holdings || {}).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0) as number
                                    const pct = nominee.totalShares > 0 ? (nodeShares / nominee.totalShares) * 100 : 0
                                    
                                    return (
                                      <div key={node.id || idx} className="flex items-center justify-between p-2 bg-dark-600/50 rounded">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-accent-400" />
                                          <span className="text-sm text-white">{node.name}</span>
                                          <span className="text-xs text-gray-500">({node.type})</span>
                                        </div>
                                        <span className="text-xs text-accent-400 font-medium">
                                          {pct.toFixed(1)}%
                                        </span>
                                      </div>
                                    )
                                  })}
                                  {terminalNodes.length > 8 && (
                                    <div className="text-xs text-gray-500 text-center py-1">
                                      + {terminalNodes.length - 8} more decision makers
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )
                        })()}
                        
                        {/* If no tree, show custody chain */}
                        {!hasTree && nominee.custodyChain && nominee.custodyChain.length > 0 && (
                          <div className="bg-dark-700/50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Custody Chain</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {nominee.custodyChain.map((level: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <div className="px-2 py-1 bg-dark-600 rounded text-xs text-white">
                                    {level.entityName || level.name}
                                  </div>
                                  {idx < nominee.custodyChain.length - 1 && (
                                    <ArrowRight className="w-3 h-3 text-gray-500" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Create New Entity Modal */}
      {showCreateModal && createModalNomineeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowCreateModal(false)
              setCreateModalNomineeId(null)
              setNewEntityName('')
            }}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-dark-800 border border-white/10 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Create New Entity</h3>
                <p className="text-sm text-gray-400">Add to database & custody chain</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateModalNomineeId(null)
                  setNewEntityName('')
                }}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Entity Name</label>
                <input
                  type="text"
                  placeholder="e.g., JP Morgan Chase, Nomura Holdings..."
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  autoFocus
                />
                {newEntityName.trim().length > 0 && newEntityName.trim().length < 2 && (
                  <div className="text-xs text-red-400 mt-1">Entity name must be at least 2 characters</div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Entity Type</label>
                <select
                  value={newEntityType}
                  onChange={(e) => setNewEntityType(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                >
                  <optgroup label="Custodians">
                    <option value="CSD">CSD (Central Securities Depository)</option>
                    <option value="Global Custodian">Global Custodian</option>
                    <option value="Regional Custodian">Regional Custodian</option>
                    <option value="Local Custodian">Local Custodian</option>
                    <option value="Clearing Broker">Clearing Broker</option>
                  </optgroup>
                  <optgroup label="End Clients">
                    <option value="Wealth Manager">Wealth Manager</option>
                    <option value="Private Bank">Private Bank</option>
                    <option value="Asset Manager">Asset Manager</option>
                    <option value="Execution Platform">Execution Platform</option>
                    <option value="Pension Fund">Pension Fund</option>
                    <option value="Family Office">Family Office</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Institution">Institution</option>
                  </optgroup>
                </select>
              </div>

              <div className="bg-dark-700/50 rounded-lg p-3 text-sm text-gray-400">
                <div className="flex items-center gap-2 text-accent-400 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">This will:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-6">
                  <li>Add entity to the central database</li>
                  <li>Add as next level in custody chain</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    const trimmedName = (newEntityName || '').trim()
                    const trimmedType = (newEntityType || '').trim()
                    if (trimmedName.length >= 2 && trimmedType.length > 0) {
                      // Add to custody chain
                      addLevelToNominee(createModalNomineeId, trimmedName, trimmedType)
                      // Close modal
                      setShowCreateModal(false)
                      setCreateModalNomineeId(null)
                      setNewEntityName('')
                    } else {
                      alert('Please enter a valid entity name (at least 2 characters)')
                    }
                  }}
                  disabled={!newEntityName || newEntityName.trim().length < 2}
                  className="flex-1 bg-primary-500 text-white px-4 py-3 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Create & Add to Chain
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateModalNomineeId(null)
                    setNewEntityName('')
                  }}
                  className="px-4 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Node Modal */}
      {showAddNodeModal && addNodeContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowAddNodeModal(false)
              setAddNodeContext(null)
            }}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-dark-800 border border-white/10 rounded-xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Add {addNodeContext.mode === 'child' ? 'Child' : 'Sibling'} Entity
                </h3>
                <p className="text-sm text-gray-400">
                  {addNodeContext.mode === 'child' ? 'Add next level in custody chain' : 'Add another entity at same level'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddNodeModal(false)
                  setAddNodeContext(null)
                }}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Available shares summary */}
            <div className="bg-dark-700/50 rounded-lg p-4 mb-6">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Available Shares to Allocate</div>
              <div className="grid grid-cols-5 gap-3">
                {defaultEtfProducts.map(etf => {
                  const available = addNodeContext.availableHoldings[etf.isin] || 0
                  const allocated = newNodeHoldings[etf.isin] || 0
                  const hasAvailable = available > 1000
                  
                  return (
                    <div key={etf.isin} className="text-center">
                      <div className="text-xs text-gray-500 truncate mb-1">{etf.isin.slice(-4)}</div>
                      <div className={`text-sm font-medium ${hasAvailable ? 'text-white' : 'text-gray-600'}`}>
                        {hasAvailable ? `${(available / 1e6).toFixed(2)}M` : '-'}
                      </div>
                      {allocated > 0 && (
                        <div className="text-xs text-accent-400 mt-0.5">
                          -{(allocated / 1e6).toFixed(2)}M
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Entity search/select */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Search Entity Database</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                
                {/* Search suggestions */}
                {newNodeName.trim().length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto bg-dark-700 border border-white/10 rounded-lg">
                    {knownEntities
                      .filter(e => e.name.toLowerCase().includes(newNodeName.toLowerCase()))
                      .slice(0, 5)
                      .map(entity => (
                        <button
                          key={entity.id}
                          onClick={() => {
                            setNewNodeName(entity.name)
                            setNewNodeType(entity.type)
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                          <div className="text-sm text-white">{entity.name}</div>
                          <div className="text-xs text-gray-500">{entity.type}</div>
                        </button>
                      ))}
                    {knownEntities.filter(e => e.name.toLowerCase().includes(newNodeName.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No matches - new entity will be created
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Entity Type</label>
                <select
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                >
                  <optgroup label="Custodians (chain continues)">
                    <option value="CSD">CSD (Central Securities Depository)</option>
                    <option value="Global Custodian">Global Custodian</option>
                    <option value="Regional Custodian">Regional Custodian</option>
                    <option value="Local Custodian">Local Custodian</option>
                    <option value="Clearing Broker">Clearing Broker</option>
                  </optgroup>
                  <optgroup label="End Clients (terminal)">
                    <option value="Wealth Manager">Wealth Manager</option>
                    <option value="Private Bank">Private Bank</option>
                    <option value="Asset Manager">Asset Manager</option>
                    <option value="Execution Platform">Execution Platform</option>
                    <option value="Pension Fund">Pension Fund</option>
                    <option value="Family Office">Family Office</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Institution">Institution</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Share allocation per ETF */}
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-3">Allocate Shares per ETF</label>
              <div className="grid grid-cols-5 gap-3">
                {defaultEtfProducts.map(etf => {
                  const available = addNodeContext.availableHoldings[etf.isin] || 0
                  const hasAvailable = available > 1000
                  
                  return (
                    <div key={etf.isin}>
                      <div className="text-xs text-gray-500 truncate mb-1">{etf.isin.slice(-4)}</div>
                      <input
                        type="number"
                        placeholder="0"
                        disabled={!hasAvailable}
                        value={newNodeHoldings[etf.isin] ? (newNodeHoldings[etf.isin] / 1e6).toString() : ''}
                        onChange={(e) => {
                          const value = Math.min(parseFloat(e.target.value) || 0, available / 1e6)
                          setNewNodeHoldings(prev => ({
                            ...prev,
                            [etf.isin]: value * 1e6
                          }))
                        }}
                        className="w-full px-2 py-2 bg-dark-700 border border-white/10 rounded text-sm text-white text-center disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                      <div className="text-xs text-gray-500 text-center mt-0.5">M shares</div>
                      {hasAvailable && (
                        <button
                          onClick={() => {
                            setNewNodeHoldings(prev => ({
                              ...prev,
                              [etf.isin]: available
                            }))
                          }}
                          className="w-full text-xs text-primary-400 hover:text-primary-300 mt-1"
                        >
                          Use all
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Quick allocation buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => {
                    const newHoldings: Record<string, number> = {}
                    defaultEtfProducts.forEach(etf => {
                      newHoldings[etf.isin] = addNodeContext.availableHoldings[etf.isin] || 0
                    })
                    setNewNodeHoldings(newHoldings)
                  }}
                  className="text-xs bg-primary-500/20 text-primary-400 px-3 py-1.5 rounded hover:bg-primary-500/30"
                >
                  Allocate 100%
                </button>
                <button
                  onClick={() => {
                    const newHoldings: Record<string, number> = {}
                    defaultEtfProducts.forEach(etf => {
                      newHoldings[etf.isin] = (addNodeContext.availableHoldings[etf.isin] || 0) / 2
                    })
                    setNewNodeHoldings(newHoldings)
                  }}
                  className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600"
                >
                  Allocate 50%
                </button>
                <button
                  onClick={() => setNewNodeHoldings({})}
                  className="text-xs text-gray-500 hover:text-gray-400 px-2 py-1.5"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Mark as terminal */}
            <label className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={newNodeIsTerminal}
                onChange={(e) => setNewNodeIsTerminal(e.target.checked)}
                className="w-4 h-4 text-accent-500 rounded"
              />
              <div>
                <div className="text-sm text-white">This is the investment decision maker</div>
                <div className="text-xs text-gray-500">Mark as complete - no further levels needed</div>
              </div>
            </label>

            {/* Validation */}
            {(() => {
              const totalAllocated = Object.values(newNodeHoldings).reduce((sum, v) => sum + v, 0)
              const hasName = newNodeName.trim().length >= 2
              
              if (!hasName) {
                return (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
                    <div className="text-sm text-yellow-400">Enter entity name (at least 2 characters)</div>
                  </div>
                )
              }
              
              if (totalAllocated === 0) {
                return (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
                    <div className="text-sm text-yellow-400">Allocate shares to at least one ETF</div>
                  </div>
                )
              }
              
              return (
                <div className="p-3 bg-accent-500/10 border border-accent-500/30 rounded-lg mb-4">
                  <div className="text-sm text-accent-400">
                    ✓ Ready to add {newNodeName} with {(totalAllocated / 1e6).toFixed(2)}M total shares
                  </div>
                </div>
              )
            })()}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  if (newNodeName.trim().length < 2) {
                    alert('Entity name must be at least 2 characters')
                    return
                  }
                  
                  const totalAllocated = Object.values(newNodeHoldings).reduce((sum, v) => sum + v, 0)
                  if (totalAllocated === 0) {
                    alert('Please allocate shares to at least one ETF')
                    return
                  }
                  
                  // Check no over-allocation
                  for (const etf of defaultEtfProducts) {
                    const allocated = newNodeHoldings[etf.isin] || 0
                    const available = addNodeContext.availableHoldings[etf.isin] || 0
                    if (allocated > available + 1000) {
                      alert(`Cannot allocate more than available for ${etf.isin.slice(-4)}`)
                      return
                    }
                  }
                  
                  // Add the node
                  addNodeToTree()
                }}
                disabled={newNodeName.trim().length < 2 || Object.values(newNodeHoldings).reduce((sum, v) => sum + v, 0) === 0}
                className="flex-1 bg-primary-500 text-white px-4 py-3 rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {addNodeContext.mode === 'child' ? 'Child' : 'Sibling'}
              </button>
              <button
                onClick={() => {
                  setShowAddNodeModal(false)
                  setAddNodeContext(null)
                }}
                className="px-4 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Full Tree View Modal */}
      <AnimatePresence>
        {showFullTreeView && fullTreeNomineeId && (() => {
          const nominee = nominees.find(n => n.id === fullTreeNomineeId)
          if (!nominee) return null
          
          // Convert internal TreeNode to OwnershipTree's TreeNodeData
          const convertToTreeNodeData = (node: TreeNode): TreeNodeData => ({
            id: node.id,
            name: node.name,
            type: node.type,
            level: node.level,
            holdings: node.holdings,
            isTerminal: node.isTerminal,
            children: node.children.map(convertToTreeNodeData),
          })
          
          // If no tree exists, create a root node from nominee holdings
          let treeData: TreeNodeData
          if (nominee.tree) {
            treeData = convertToTreeNodeData(nominee.tree)
          } else {
            // Create root node (Level 0) from nominee
            treeData = {
              id: `tree-${nominee.id}-root`,
              name: nominee.name,
              type: 'Nominee (Level 0)',
              level: 0,
              holdings: { ...nominee.holdings },
              isTerminal: false,
              children: []
            }
            // Also initialize the tree in the nominee state
            setNominees(prev => prev.map(nom => {
              if (nom.id === fullTreeNomineeId && !nom.tree) {
                const newTree: TreeNode = {
                  id: treeData.id,
                  name: treeData.name,
                  type: treeData.type,
                  level: 0,
                  holdings: { ...nom.holdings },
                  isTerminal: false,
                  children: []
                }
                return { ...nom, tree: newTree }
              }
              return nom
            }))
          }
          
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-[#0a0e1a]"
            >
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-[#0f1218] border-b border-white/10 flex items-center justify-between px-6 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{nominee.name}</h2>
                    <p className="text-sm text-gray-400">Ownership Tree Visualization</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowFullTreeView(false)
                    setFullTreeNomineeId(null)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Close
                </button>
              </div>
              
              {/* Tree Container */}
              <div className="pt-16 h-full">
                <OwnershipTree
                  rootNode={treeData}
                  nomineeHoldings={nominee.holdings}
                  etfProducts={defaultEtfProducts}
                  onAddChild={(parentId, nodeData) => {
                    // Add child to tree
                    const newNode: TreeNode = {
                      id: `node-${Date.now()}`,
                      name: nodeData.name,
                      type: nodeData.type,
                      level: 0, // Will be calculated
                      holdings: nodeData.holdings,
                      isTerminal: nodeData.isTerminal,
                      children: []
                    }
                    
                    setNominees(prev => {
                      const updated = prev.map(nom => {
                        if (nom.id !== fullTreeNomineeId || !nom.tree) return nom
                        
                        const cloneTree = (node: TreeNode): TreeNode => ({
                          ...node,
                          children: node.children.map(cloneTree)
                        })
                        const newTree = cloneTree(nom.tree)
                        
                        const addToParent = (node: TreeNode): boolean => {
                          if (node.id === parentId) {
                            newNode.level = node.level + 1
                            node.children.push(newNode)
                            node.isTerminal = false
                            return true
                          }
                          for (const child of node.children) {
                            if (addToParent(child)) return true
                          }
                          return false
                        }
                        
                        addToParent(newTree)
                        
                        const checkAllTerminal = (node: TreeNode): boolean => {
                          if (node.children.length === 0) return node.isTerminal
                          return node.children.every(checkAllTerminal)
                        }
                        const allComplete = checkAllTerminal(newTree)
                        
                        return {
                          ...nom,
                          tree: newTree,
                          status: allComplete ? 'resolved' : `level-${newNode.level}`,
                          confidence: allComplete ? 100 : 0
                        }
                      })
                      if (registerId) {
                        updateWorkflow(registerId, { nominees: updated })
                      }
                      return updated
                    })
                    recalculateDiscovered()
                  }}
                  onAddSibling={(siblingId, nodeData) => {
                    // Add sibling - find parent of sibling and add there
                    const newNode: TreeNode = {
                      id: `node-${Date.now()}`,
                      name: nodeData.name,
                      type: nodeData.type,
                      level: 0,
                      holdings: nodeData.holdings,
                      isTerminal: nodeData.isTerminal,
                      children: []
                    }
                    
                    setNominees(prev => {
                      const updated = prev.map(nom => {
                        if (nom.id !== fullTreeNomineeId || !nom.tree) return nom
                        
                        const cloneTree = (node: TreeNode): TreeNode => ({
                          ...node,
                          children: node.children.map(cloneTree)
                        })
                        const newTree = cloneTree(nom.tree)
                        
                        const addSiblingTo = (node: TreeNode): boolean => {
                          const siblingIdx = node.children.findIndex(c => c.id === siblingId)
                          if (siblingIdx !== -1) {
                            newNode.level = node.children[siblingIdx].level
                            node.children.push(newNode)
                            return true
                          }
                          for (const child of node.children) {
                            if (addSiblingTo(child)) return true
                          }
                          return false
                        }
                        
                        addSiblingTo(newTree)
                        
                        return { ...nom, tree: newTree }
                      })
                      if (registerId) {
                        updateWorkflow(registerId, { nominees: updated })
                      }
                      return updated
                    })
                    recalculateDiscovered()
                  }}
                  onDeleteNode={(nodeId) => {
                    deleteNodeFromTree(fullTreeNomineeId, nodeId)
                  }}
                  onMarkTerminal={(nodeId) => {
                    markNodeTerminal(fullTreeNomineeId, nodeId)
                  }}
                  knownEntities={allKnownEntities.map(e => ({ 
                    id: e.id, 
                    name: e.name, 
                    type: e.type,
                    lei: e.lei,
                    fcaRef: e.fcaRef,
                    aumBand: e.aumBand
                  }))}
                  onCreateEntity={handleCreateEntity}
                />
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

// Simple inline NAV chart component for modal
const NAVChartInline: React.FC<{ isin: string; name?: string; currency?: string }> = ({ isin, name, currency = 'EUR' }) => {
  const [data, setData] = useState<{ date: string; nav: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/nav/${isin}/history?period=3mo`)
        if (response.ok) {
          const result = await response.json()
          setData(result.data || [])
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      }
      setLoading(false)
    }
    fetchData()
  }, [isin])

  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    )
  }

  if (error || data.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-gray-500 text-sm">
        <p>NAV chart not available</p>
        <p className="text-xs mt-1">ISIN may not be mapped to Yahoo Finance</p>
      </div>
    )
  }

  const stats = {
    current: data[data.length - 1]?.nav || 0,
    start: data[0]?.nav || 0,
    change: data.length > 1 ? ((data[data.length - 1].nav - data[0].nav) / data[0].nav) * 100 : 0
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">{name || 'NAV History'}</div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-white">{symbol}{stats.current.toFixed(2)}</span>
            <span className={`text-sm flex items-center gap-1 ${stats.change >= 0 ? 'text-accent-400' : 'text-red-400'}`}>
              {stats.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="px-2 py-1 rounded bg-accent-500/20 text-accent-400 text-xs">
          Yahoo Finance
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`chartGrad-${isin}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stats.change >= 0 ? '#22c56d' : '#ef4444'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={stats.change >= 0 ? '#22c56d' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: number) => [`${symbol}${value.toFixed(2)}`, 'NAV']}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Area
              type="monotone"
              dataKey="nav"
              stroke={stats.change >= 0 ? '#22c56d' : '#ef4444'}
              fill={`url(#chartGrad-${isin})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-gray-500 text-center">
        {data.length} days of data • Last 3 months
      </div>
    </div>
  )
}

// ETF Database View Component
const ETFDatabaseView = () => {
  const { etfProducts, getETFsForIssuer, addHistoricalData, updateShareClass } = useETFDatabase()
  const [selectedIssuer, setSelectedIssuer] = useState<string>('all')
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedETF, setSelectedETF] = useState<ETFProduct | null>(null)
  const [isRefreshingNAV, setIsRefreshingNAV] = useState(false)
  const [navServiceAvailable, setNavServiceAvailable] = useState<boolean | null>(null)
  const [liveNAVs, setLiveNAVs] = useState<Record<string, { nav: number; currency: string; change?: number }>>({})
  
  // Check if NAV service is available on mount
  useEffect(() => {
    const checkService = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/nav/mappings')
        setNavServiceAvailable(response.ok)
      } catch {
        setNavServiceAvailable(false)
      }
    }
    checkService()
  }, [])
  
  // Refresh NAV data from Yahoo Finance
  const refreshNAVData = async () => {
    if (!navServiceAvailable) return
    
    setIsRefreshingNAV(true)
    
    // Get all ISINs from our products
    const isins = etfProducts.flatMap(p => p.shareClasses.map(sc => sc.isin))
    
    try {
      const response = await fetch('http://localhost:8000/api/nav/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isins)
      })
      
      if (response.ok) {
        const result = await response.json()
        const newLiveNAVs: Record<string, { nav: number; currency: string; change?: number }> = {}
        
        Object.entries(result.data).forEach(([isin, data]: [string, any]) => {
          if (data && data.nav) {
            newLiveNAVs[isin] = {
              nav: data.nav,
              currency: data.currency,
              change: data.change_percent
            }
          }
        })
        
        setLiveNAVs(newLiveNAVs)
        console.log(`Refreshed NAV for ${Object.keys(newLiveNAVs).length} ISINs`)
      }
    } catch (error) {
      console.error('Failed to refresh NAV data:', error)
    }
    
    setIsRefreshingNAV(false)
  }
  
  // Filter ETF products
  const filteredProducts = etfProducts.filter(etf => {
    const matchesIssuer = selectedIssuer === 'all' || etf.issuerId === selectedIssuer
    const matchesSearch = etf.baseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      etf.shareClasses.some(sc => sc.isin.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || etf.category === selectedCategory
    return matchesIssuer && matchesSearch && matchesCategory
  })
  
  // Get unique issuers and categories
  const issuers = [...new Set(etfProducts.map(e => e.issuerId))]
  const categories = [...new Set(etfProducts.map(e => e.category))]
  
  // Format large numbers
  const formatAUM = (value: number) => {
    if (value >= 1e12) return `€${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `€${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `€${(value / 1e6).toFixed(1)}M`
    return `€${value.toLocaleString()}`
  }
  
  const formatShares = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`
    return value.toString()
  }
  
  const toggleExpanded = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }
  
  // Calculate totals
  const totalProducts = filteredProducts.length
  const totalShareClasses = filteredProducts.reduce((sum, p) => sum + p.shareClasses.length, 0)
  const totalAUM = filteredProducts.reduce((sum, p) => 
    sum + p.shareClasses.reduce((scSum, sc) => scSum + sc.currentAum, 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">ETF Database</h2>
          <p className="text-gray-400">Central repository of analyzed ETFs with historical NAV data</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Yahoo Finance Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
            navServiceAvailable === null ? 'bg-gray-500/20 text-gray-400' :
            navServiceAvailable ? 'bg-accent-500/20 text-accent-400' : 'bg-red-500/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              navServiceAvailable === null ? 'bg-gray-400' :
              navServiceAvailable ? 'bg-accent-400 animate-pulse' : 'bg-red-400'
            }`} />
            {navServiceAvailable === null ? 'Checking...' :
             navServiceAvailable ? 'Yahoo Finance Live' : 'NAV Service Offline'}
          </div>
          
          {/* Refresh NAV Button */}
          <button 
            onClick={refreshNAVData}
            disabled={!navServiceAvailable || isRefreshingNAV}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              navServiceAvailable && !isRefreshingNAV
                ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingNAV ? 'animate-spin' : ''}`} />
            {isRefreshingNAV ? 'Refreshing...' : 'Refresh NAV'}
          </button>
          
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add ETF
          </button>
        </div>
      </div>
      
      {/* Live NAV Banner */}
      {Object.keys(liveNAVs).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent-500/10 border border-accent-500/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Live NAV Data Loaded</div>
                <div className="text-xs text-gray-400">
                  {Object.keys(liveNAVs).length} ISINs updated from Yahoo Finance
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="card-glass rounded-xl p-4"
        >
          <div className="text-sm text-gray-500 mb-1">Total Products</div>
          <div className="text-2xl font-bold text-white">{totalProducts}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card-glass rounded-xl p-4"
        >
          <div className="text-sm text-gray-500 mb-1">Share Classes</div>
          <div className="text-2xl font-bold text-white">{totalShareClasses}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-glass rounded-xl p-4"
        >
          <div className="text-sm text-gray-500 mb-1">Total AUM</div>
          <div className="text-2xl font-bold text-accent-400">{formatAUM(totalAUM)}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-glass rounded-xl p-4"
        >
          <div className="text-sm text-gray-500 mb-1">Issuers</div>
          <div className="text-2xl font-bold text-white">{issuers.length}</div>
        </motion.div>
      </div>
      
      {/* Filters */}
      <div className="card-glass rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or ISIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-primary-500 outline-none"
            />
          </div>
          
          {/* Issuer Filter */}
          <select
            value={selectedIssuer}
            onChange={(e) => setSelectedIssuer(e.target.value)}
            className="px-4 py-2 bg-dark-800 border border-white/10 rounded-lg text-white focus:border-primary-500 outline-none"
          >
            <option value="all">All Issuers</option>
            {issuers.map(issuer => (
              <option key={issuer} value={issuer} className="capitalize">{issuer}</option>
            ))}
          </select>
          
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-dark-800 border border-white/10 rounded-lg text-white focus:border-primary-500 outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* ETF Products List */}
      <div className="card-glass rounded-xl overflow-hidden">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th>ETF Product</th>
              <th>Issuer</th>
              <th>Category</th>
              <th>Share Classes</th>
              <th>Total AUM</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product, index) => {
              const isExpanded = expandedProducts.has(product.id)
              const productAUM = product.shareClasses.reduce((sum, sc) => sum + sc.currentAum, 0)
              
              return (
                <>
                  <tr 
                    key={product.id}
                    className="hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => toggleExpanded(product.id)}
                  >
                    <td className="w-8 text-center">
                      <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </td>
                    <td>
                      <div className="font-medium text-white">{product.baseName}</div>
                      <div className="text-xs text-gray-500">{product.benchmark || 'N/A'}</div>
                    </td>
                    <td className="capitalize">{product.issuerId}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        product.category === 'Equity' ? 'bg-blue-500/20 text-blue-400' :
                        product.category === 'Fixed Income' ? 'bg-green-500/20 text-green-400' :
                        product.category === 'Commodity' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {product.category}
                      </span>
                    </td>
                    <td>{product.shareClasses.length} classes</td>
                    <td className="text-accent-400 font-medium">{formatAUM(productAUM)}</td>
                    <td className="text-gray-400 text-sm">
                      {new Date(product.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedETF(product); }}
                          className="text-primary-400 hover:text-primary-300 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-white text-sm">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Share Classes */}
                  {isExpanded && product.shareClasses.map((sc, scIdx) => {
                    const liveData = liveNAVs[sc.isin]
                    const navToShow = liveData?.nav || sc.currentNav
                    const currencySymbol = (liveData?.currency || sc.currency) === 'USD' ? '$' : 
                                          (liveData?.currency || sc.currency) === 'GBP' ? '£' : '€'
                    
                    return (
                      <tr 
                        key={`${product.id}-${sc.isin}`}
                        className="bg-dark-800/30"
                      >
                        <td></td>
                        <td className="pl-8">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-8 rounded bg-primary-500/30" />
                            <div>
                              <div className="text-sm text-white">{sc.name}</div>
                              <div className="text-xs text-gray-500 font-mono">{sc.isin}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              sc.type === 'accumulation' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                            }`}>
                              {sc.type === 'accumulation' ? 'Acc' : 'Inc'}
                            </span>
                            <span className="text-xs text-gray-500">{liveData?.currency || sc.currency}</span>
                            {sc.hedged && (
                              <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">Hedged</span>
                            )}
                          </div>
                        </td>
                        <td className="text-sm">
                          <div className="flex items-center gap-2">
                            <span className={liveData ? 'text-white font-medium' : 'text-gray-400'}>
                              {currencySymbol}{navToShow.toFixed(2)}
                            </span>
                            {liveData && (
                              <span className="flex items-center gap-0.5 text-xs">
                                {liveData.change !== undefined && (
                                  liveData.change >= 0 ? (
                                    <span className="text-accent-400 flex items-center">
                                      <TrendingUp className="w-3 h-3" />
                                      +{liveData.change.toFixed(2)}%
                                    </span>
                                  ) : (
                                    <span className="text-red-400 flex items-center">
                                      <TrendingDown className="w-3 h-3" />
                                      {liveData.change.toFixed(2)}%
                                    </span>
                                  )
                                )}
                              </span>
                            )}
                            {liveData && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent-500/20 text-accent-400">LIVE</span>
                            )}
                          </div>
                        </td>
                        <td className="text-sm text-gray-400">
                          {formatShares(sc.currentSharesOutstanding)} shares
                        </td>
                        <td className="text-accent-400 font-medium text-sm">{formatAUM(sc.currentAum)}</td>
                        <td className="text-gray-500 text-xs">
                          {sc.historicalData.length} data points
                        </td>
                        <td></td>
                      </tr>
                    )
                  })}
                </>
              )
            })}
          </tbody>
        </table>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No ETF products found matching your criteria</p>
          </div>
        )}
      </div>
      
      {/* ETF Detail Modal */}
      <AnimatePresence>
        {selectedETF && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setSelectedETF(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-900 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedETF.baseName}</h3>
                  <p className="text-sm text-gray-500">{selectedETF.benchmark || 'N/A'} • {selectedETF.category}</p>
                </div>
                <button
                  onClick={() => setSelectedETF(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* NAV Chart for first share class */}
              {navServiceAvailable && selectedETF.shareClasses.length > 0 && (
                <div className="bg-dark-800/50 rounded-xl p-4 mb-6">
                  <NAVChartInline 
                    isin={selectedETF.shareClasses[0].isin}
                    name={selectedETF.baseName}
                    currency={selectedETF.shareClasses[0].currency}
                  />
                </div>
              )}
              
              {/* Share Classes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {selectedETF.shareClasses.map(sc => {
                  const liveData = liveNAVs[sc.isin]
                  const navToShow = liveData?.nav || sc.currentNav
                  const currencySymbol = (liveData?.currency || sc.currency) === 'USD' ? '$' : 
                                        (liveData?.currency || sc.currency) === 'GBP' ? '£' : '€'
                  
                  return (
                    <div key={sc.isin} className="bg-dark-800/50 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium text-white text-sm">{sc.name}</div>
                          <div className="text-xs font-mono text-gray-500">{sc.isin}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            sc.type === 'accumulation' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {sc.type === 'accumulation' ? 'Acc' : 'Inc'}
                          </span>
                          {sc.hedged && (
                            <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">H</span>
                          )}
                          {liveData && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent-500/20 text-accent-400">LIVE</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-500 text-xs">NAV</div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{currencySymbol}{navToShow.toFixed(2)}</span>
                            {liveData?.change !== undefined && (
                              <span className={`text-xs flex items-center gap-0.5 ${
                                liveData.change >= 0 ? 'text-accent-400' : 'text-red-400'
                              }`}>
                                {liveData.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {liveData.change >= 0 ? '+' : ''}{liveData.change.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">Currency</div>
                          <div className="text-white font-medium">{liveData?.currency || sc.currency}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">Shares Outstanding</div>
                          <div className="text-white font-medium">{formatShares(sc.currentSharesOutstanding)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">AUM</div>
                          <div className="text-accent-400 font-medium">{formatAUM(sc.currentAum)}</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="text-xs text-gray-500">
                          {sc.historicalData.length} historical data points
                          • Inception: {new Date(sc.inceptionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button className="btn-secondary flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export NAV History
                </button>
                <button className="btn-primary flex items-center gap-2">
                  <Edit className="w-4 h-4" /> Edit Product
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Settings Component
const AnalystSettings = () => {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Analyst Settings</h2>
        <p className="text-gray-400">Configure analysis preferences and defaults</p>
      </div>

      <div className="card-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Default Matching Settings</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300">Auto-match known entities on upload</span>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-accent-500 rounded" />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300">Fuzzy matching for name variations</span>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-accent-500 rounded" />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300">LEI cross-reference enabled</span>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-accent-500 rounded" />
          </label>
        </div>
      </div>

      <div className="card-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Disclosure Templates</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
            <span className="text-white">Section 1062 Notice Template</span>
            <button className="text-primary-400 hover:text-primary-300 text-sm">Edit</button>
          </div>
          <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
            <span className="text-white">Follow-up Notice Template</span>
            <button className="text-primary-400 hover:text-primary-300 text-sm">Edit</button>
          </div>
        </div>
      </div>

      <div className="card-glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Confidence Thresholds</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Auto-match threshold (%)</label>
            <input
              type="range"
              min="50"
              max="100"
              defaultValue="90"
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalysisDashboard

