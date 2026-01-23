// Core data types for the ETF Ownership Analytics Platform

export interface Issuer {
  id: string
  name: string
  logo?: string
  etfCount: number
  totalAum: number
  createdAt: string
}

export interface ETF {
  id: string
  issuerId: string
  name: string
  isin: string
  ticker: string
  aum: number
  nav: number
  sharesOutstanding: number
  currency: string
  domicile: string
  lastUpdated: string
}

export interface ShareRegister {
  id: string
  issuerId: string
  uploadDate: string
  asOfDate: string
  status: 'pending' | 'processing' | 'analyzed' | 'complete'
  totalHolders: number
  etfColumns: ETFColumn[]  // All ETF products in this register
  entries: ShareRegisterEntry[]
}

export interface ETFColumn {
  isin: string
  name?: string
  totalShares: number
  nav?: number
}

export interface ShareRegisterEntry {
  id: string
  registerId: string
  accountName: string
  accountNumber: string
  holdings: { [isin: string]: number }  // Shares by ETF ISIN
  totalShares: number  // Sum across all ETFs
  entityType: EntityType
  resolvedEntity?: ResolvedEntity
  confidence: number
  requiresDisclosure: boolean
  disclosureStatus?: 'pending' | 'sent' | 'received' | 'overdue'
}

export type EntityType = 
  | 'csd' 
  | 'global_custodian' 
  | 'local_custodian' 
  | 'dedicated_nominee' 
  | 'pooled_nominee'
  | 'wealth_manager'
  | 'private_bank'
  | 'platform'
  | 'asset_manager'
  | 'pension_fund'
  | 'insurance'
  | 'fund_of_funds'
  | 'market_maker'
  | 'unknown'

export interface ResolvedEntity {
  id: string
  name: string
  type: EntityType
  parentEntity?: string
  ultimateParent?: string
  country: string
  lei?: string
  fcaRef?: string
  estimatedAum?: number
  tags: string[]
}

export interface KnownEntity {
  id: string
  name: string
  nameVariations: string[]
  type: EntityType
  parentId?: string
  country: string
  lei?: string
  fcaRef?: string
  nomineeNames: string[]
  tags: string[]
  notes?: string  // Additional notes about the entity
  aumBand?: string  // AUM range/band (e.g., "£50bn+", "CHF 400bn+")
  dedicatedAccountPattern?: string  // Regex pattern for dedicated account matching
  createdAt: string
  updatedAt: string
}

export interface OwnershipAnalysis {
  id: string
  registerId: string
  etfId: string
  analysisDate: string
  status: 'in_progress' | 'layer_1' | 'layer_2' | 'layer_3' | 'complete'
  currentLayer: number
  totalLayers: number
  progress: number
  summary: OwnershipSummary
  breakdown: OwnershipBreakdown[]
  disclosureRequests: DisclosureRequest[]
}

export interface OwnershipSummary {
  totalIdentified: number
  percentageIdentified: number
  wealthManagers: number
  privateBanks: number
  platforms: number
  assetManagers: number
  institutionalInvestors: number
  unknown: number
  pendingDisclosure: number
}

export interface OwnershipBreakdown {
  entityId: string
  entityName: string
  entityType: EntityType
  shares: number
  percentage: number
  change?: number
  changePercent?: number
  isNew?: boolean
}

export interface DisclosureRequest {
  id: string
  analysisId: string
  targetEntity: string
  targetType: EntityType
  dateSent: string
  dueDate: string
  status: 'pending' | 'sent' | 'received' | 'overdue' | 'non_compliant'
  response?: string
  receivedDate?: string
}

export interface DailyChange {
  date: string
  etfId: string
  nav: number
  sharesOutstanding: number
  netNewAssets: number
  topChanges: {
    entity: string
    shareChange: number
    percentChange: number
  }[]
}

export interface AnalysisReport {
  id: string
  issuerId: string
  etfIds: string[]
  generatedDate: string
  reportType: 'quarterly' | 'monthly' | 'on_demand'
  status: 'generating' | 'ready' | 'delivered'
  downloadUrl?: string
  summary: OwnershipSummary
}

// Pricing related
export interface PricingTier {
  id: string
  name: string
  etfLimit: number | 'unlimited'
  analysisFrequency: string
  priceQuarterly: number
  priceAnnual: number
  features: string[]
}

// UI State
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
}

