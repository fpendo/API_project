/**
 * NAV Data API Service
 * Fetches real-time and historical NAV data from Yahoo Finance via backend
 */

// Use relative URL for production, absolute for development
const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000'

export interface NAVData {
  isin: string
  yahoo_symbol: string
  name: string
  nav: number
  currency: string
  change?: number
  change_percent?: number
  volume?: number
  market_cap?: number
  fifty_two_week_high?: number
  fifty_two_week_low?: number
  fetched_at: string
}

export interface NAVHistoryPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  nav: number  // Same as close
}

export interface NAVHistoryResponse {
  isin: string
  yahoo_symbol: string
  period: string
  count: number
  data: NAVHistoryPoint[]
}

export interface NAVMappings {
  mappings: Record<string, string>
}

export interface BulkNAVResponse {
  success_count: number
  failed_count: number
  data: Record<string, NAVData>
  errors: Record<string, { error: string }>
}

/**
 * Get current NAV for a single ISIN
 */
export const getCurrentNAV = async (isin: string): Promise<NAVData | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/nav/${isin}/current`)
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`NAV not found for ${isin} - mapping may be missing`)
        return null
      }
      throw new Error(`HTTP error ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Failed to fetch NAV for ${isin}:`, error)
    return null
  }
}

/**
 * Get historical NAV data for NNA calculations
 */
export const getNAVHistory = async (
  isin: string,
  options: {
    startDate?: string
    endDate?: string
    period?: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'ytd' | 'max'
  } = { period: '1y' }
): Promise<NAVHistoryResponse | null> => {
  try {
    const params = new URLSearchParams()
    if (options.startDate) params.append('start_date', options.startDate)
    if (options.endDate) params.append('end_date', options.endDate)
    if (options.period && !options.startDate) params.append('period', options.period)
    
    const url = `${API_BASE}/api/nav/${isin}/history?${params.toString()}`
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`NAV history not found for ${isin}`)
        return null
      }
      throw new Error(`HTTP error ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Failed to fetch NAV history for ${isin}:`, error)
    return null
  }
}

/**
 * Get current NAV for multiple ISINs at once
 */
export const getBulkNAVs = async (isins: string[]): Promise<BulkNAVResponse | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/nav/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isins)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch bulk NAVs:', error)
    return null
  }
}

/**
 * Get all ISIN to Yahoo symbol mappings
 */
export const getNAVMappings = async (): Promise<NAVMappings | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/nav/mappings`)
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch NAV mappings:', error)
    return null
  }
}

/**
 * Add a new ISIN to Yahoo symbol mapping
 */
export const addNAVMapping = async (isin: string, yahooSymbol: string): Promise<boolean> => {
  try {
    const params = new URLSearchParams({ isin, yahoo_symbol: yahooSymbol })
    const response = await fetch(`${API_BASE}/api/nav/mappings?${params.toString()}`, {
      method: 'POST'
    })
    return response.ok
  } catch (error) {
    console.error('Failed to add NAV mapping:', error)
    return false
  }
}

/**
 * Calculate NNA (Net New Assets) between two dates
 * Formula: NNA = (Shares_End - Shares_Start) × Average_NAV
 */
export const calculateNNA = (
  history: NAVHistoryPoint[],
  startShares: number,
  endShares: number
): {
  nna: number
  shareChange: number
  avgNAV: number
  startNAV: number
  endNAV: number
} => {
  if (history.length === 0) {
    return { nna: 0, shareChange: 0, avgNAV: 0, startNAV: 0, endNAV: 0 }
  }
  
  const shareChange = endShares - startShares
  const avgNAV = history.reduce((sum, h) => sum + h.nav, 0) / history.length
  const startNAV = history[0].nav
  const endNAV = history[history.length - 1].nav
  const nna = shareChange * avgNAV
  
  return { nna, shareChange, avgNAV, startNAV, endNAV }
}

/**
 * Format currency value
 */
export const formatCurrency = (value: number, currency: string = 'EUR'): string => {
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'
  if (Math.abs(value) >= 1e9) return `${symbol}${(value / 1e9).toFixed(2)}B`
  if (Math.abs(value) >= 1e6) return `${symbol}${(value / 1e6).toFixed(2)}M`
  if (Math.abs(value) >= 1e3) return `${symbol}${(value / 1e3).toFixed(2)}K`
  return `${symbol}${value.toFixed(2)}`
}

/**
 * Check if NAV service is available
 */
export const checkNAVServiceHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/api/nav/mappings`)
    return response.ok
  } catch {
    return false
  }
}

