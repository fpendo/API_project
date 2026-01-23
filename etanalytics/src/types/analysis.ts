/**
 * Analysis Dashboard Types
 */

// Tree node for custody chain - represents an entity at any level
export interface TreeNode {
  id: string
  name: string
  type: string
  level: number
  holdings: Record<string, number>  // shares per ETF at this node
  isTerminal: boolean  // true if this is an investment decision maker
  children: TreeNode[]  // child nodes (next level down)
}

// Legacy custody chain level (kept for backwards compatibility during matching)
export interface CustodyLevel {
  level: number
  name: string
  type: string
  resolved: boolean
}

// Nominee type for workflow
export interface NomineeState {
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
export interface ETFDataState {
  isin: string
  name: string
  totalShares: number
  identifiedPct: number
  clients: { name: string; shares: number; pct: number }[]
}

// Workflow state types
export interface WorkflowState {
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
export interface WorkflowContextType {
  workflows: Record<string, WorkflowState>
  updateWorkflow: (id: string, state: Partial<WorkflowState>) => void
  activeWorkflowId: string | null
  setActiveWorkflowId: (id: string | null) => void
}



