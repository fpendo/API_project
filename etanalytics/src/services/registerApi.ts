/**
 * Register API Service
 * Handles share register upload, analysis, and disclosure operations
 */

// Use relative URL for production, absolute for development
const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000'

// ============================================================================
// Types
// ============================================================================

export interface ETFColumn {
  isin: string
  name: string
  shares_outstanding: number
}

export interface ShareRegisterEntry {
  id: string
  account_name: string
  account_number: string
  total_shares: number
  holdings: Record<string, number>  // ISIN -> shares
  entity_type: string
  confidence: number
  matched_entity_id?: string
}

export interface ShareRegister {
  id: string
  issuer_id: string
  upload_date: string
  status: 'uploaded' | 'analyzed' | 'in_progress'
  total_holders: number
  total_etfs: number
  etf_columns: ETFColumn[]
  etf_isins: string[]
  entries: ShareRegisterEntry[]
}

export interface ETFBreakdown {
  name: string
  total_shares: number
  total_holders: number
  identified_shares: number
  matched_shares: number
  identified_percentage: number  // % of shares where decision maker is identified
  matched_percentage: number      // % of shares where entity type is known (matched)
  by_type: Record<string, { count: number; shares: number; percentage: number }>
}

export interface AnalysisResult {
  id: string
  register_id: string
  status: string
  progress: number
  current_layer: number
  total_layers: number
  identified_percentage: number   // % of shares where decision maker is identified
  matched_percentage: number      // % of shares where entity type is known
  identified_shares: number
  matched_shares: number
  total_shares: number
  etf_breakdown: Record<string, ETFBreakdown>
  entity_breakdown: Record<string, { count: number; total_shares: number; percentage: number }>
}

export interface RegisterListResponse {
  registers: ShareRegister[]
  total: number
}

export interface UploadResponse {
  register_id: string
  message: string
  holders: number
  etf_columns: ETFColumn[]
}

export interface DisclosureResponse {
  success: boolean
  entry_id: string
  new_entity_type: string
  new_confidence: number
  message: string
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Upload a share register CSV file
 */
export const uploadRegister = async (
  file: File,
  issuerId: string = 'default'
): Promise<UploadResponse | null> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('issuer_id', issuerId)

    const response = await fetch(`${API_BASE}/api/registers/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      console.error('Upload failed:', error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to upload register:', error)
    return null
  }
}

/**
 * Get all registers
 */
export const getRegisters = async (): Promise<RegisterListResponse | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/registers`, {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to fetch registers:', error)
    return null
  }
}

/**
 * Get a single register by ID
 */
export const getRegister = async (registerId: string): Promise<ShareRegister | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/registers/${registerId}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Register not found: ${registerId}`)
        return null
      }
      throw new Error(`HTTP error ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Failed to fetch register ${registerId}:`, error)
    return null
  }
}

/**
 * Get ETF-specific data from a register
 */
export const getRegisterETF = async (
  registerId: string,
  isin: string
): Promise<{ entries: ShareRegisterEntry[]; total_shares: number } | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/registers/${registerId}/etf/${isin}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Failed to fetch ETF ${isin} from register ${registerId}:`, error)
    return null
  }
}

/**
 * Run entity matching analysis on a register
 */
export const runAnalysis = async (registerId: string): Promise<AnalysisResult | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/registers/${registerId}/analyze`, {
      method: 'POST',
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Analysis failed' }))
      console.error('Analysis failed:', error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Failed to run analysis on register ${registerId}:`, error)
    return null
  }
}

/**
 * Submit a disclosure request for an entry
 */
export const submitDisclosure = async (
  registerId: string,
  entryId: string,
  disclosedEntityType?: string,
  disclosedEntityName?: string
): Promise<DisclosureResponse | null> => {
  try {
    const params = new URLSearchParams()
    if (disclosedEntityType) params.append('disclosed_entity_type', disclosedEntityType)
    if (disclosedEntityName) params.append('disclosed_entity_name', disclosedEntityName)

    const url = `${API_BASE}/api/registers/${registerId}/disclosure/${entryId}${params.toString() ? '?' + params.toString() : ''}`
    
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Disclosure failed' }))
      console.error('Disclosure failed:', error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Failed to submit disclosure for entry ${entryId}:`, error)
    return null
  }
}

/**
 * Check if the register API is available
 */
export const checkRegisterServiceHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/api/registers`, {
      credentials: 'include'
    })
    return response.ok
  } catch {
    return false
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine if an entity type is an investment decision maker
 */
export const isDecisionMakerType = (entityType: string): boolean => {
  const decisionMakerTypes = [
    'wealth_manager',
    'platform',
    'private_bank',
    'asset_manager',
    'robo_advisor',
    'family_office',
    'pension',
    'pension_fund',
    // Also check display labels
    'Wealth Manager',
    'Execution Platform',
    'Private Bank',
    'Asset Manager',
    'Family Office',
    'Pension Fund',
    'Institution'
  ]
  return decisionMakerTypes.includes(entityType)
}

/**
 * Calculate identified percentage from entries
 * Only counts decision makers (confidence=100)
 */
export const calculateIdentifiedPercentage = (
  entries: ShareRegisterEntry[],
  totalShares: number
): number => {
  if (totalShares === 0) return 0
  
  const identifiedShares = entries
    .filter(e => e.confidence === 100)
    .reduce((sum, e) => sum + e.total_shares, 0)
  
  return Math.round((identifiedShares / totalShares) * 1000) / 10
}

/**
 * Calculate matched percentage from entries
 * Counts all shares where entity type is known (not unknown)
 */
export const calculateMatchedPercentage = (
  entries: ShareRegisterEntry[],
  totalShares: number
): number => {
  if (totalShares === 0) return 0
  
  const matchedShares = entries
    .filter(e => e.entity_type !== 'unknown')
    .reduce((sum, e) => sum + e.total_shares, 0)
  
  return Math.round((matchedShares / totalShares) * 1000) / 10
}

