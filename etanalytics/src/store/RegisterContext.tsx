import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react'
import { generateHistoricalRegisters, generateHistoricalWorkflows } from './historicalData'
import * as registerApi from '../services/registerApi'

// Interface for an uploaded register
export interface UploadedRegister {
  id: string
  issuerId: string
  issuerName: string
  fileName: string
  uploadDate: string
  registerDate: string  // The date the share register was issued (from the issuer)
  totalHolders: number
  status: 'pending' | 'in_progress' | 'analyzed' | 'delivered'
  identifiedPct?: number
  etfs: Array<{
    isin: string
    name: string
    totalShares: number
  }>
  nominees: Array<{
    name: string
    accountNumber?: string
    holdings: Record<string, number>
    totalShares: number
  }>
}

interface RegisterContextType {
  uploadedRegisters: UploadedRegister[]
  addRegister: (register: UploadedRegister) => void
  removeRegister: (id: string) => void
  clearAllRegisters: () => void
  getRegister: (id: string) => UploadedRegister | undefined
  getRegistersForIssuer: (issuerId: string) => UploadedRegister[]
  updateRegisterStatus: (id: string, status: UploadedRegister['status'], identifiedPct?: number) => void
  initializeWithHistoricalData: () => void
  // API integration
  isLiveMode: boolean
  setLiveMode: (live: boolean) => void
  isBackendAvailable: boolean
  fetchFromBackend: () => Promise<void>
  uploadToBackend: (file: File, issuerId: string, issuerName: string) => Promise<UploadedRegister | null>
  runBackendAnalysis: (registerId: string) => Promise<registerApi.AnalysisResult | null>
}

const RegisterContext = createContext<RegisterContextType | undefined>(undefined)

// LocalStorage keys
const STORAGE_KEY = 'etanalytics_registers'
const WORKFLOWS_STORAGE_KEY = 'etanalytics_workflows'
const DATA_VERSION_KEY = 'etanalytics_data_version'
const CURRENT_DATA_VERSION = 'v8-report-timing-fix' // Increment to force regeneration

export const RegisterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLiveMode, setLiveMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('etanalytics_live_mode') === 'true'
    } catch {
      return false
    }
  })
  const [isBackendAvailable, setBackendAvailable] = useState<boolean>(false)
  
  const [uploadedRegisters, setUploadedRegisters] = useState<UploadedRegister[]>(() => {
    // Check data version - force regeneration if structure changed
    const savedVersion = localStorage.getItem(DATA_VERSION_KEY)
    const needsRegeneration = savedVersion !== CURRENT_DATA_VERSION
    
    if (needsRegeneration) {
      console.log(`Data version mismatch (${savedVersion} vs ${CURRENT_DATA_VERSION}) - regenerating all data`)
      // Clear old data
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(WORKFLOWS_STORAGE_KEY)
    }
    
    // Load from localStorage on init
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && !needsRegeneration) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) {
          // Migrate old data format: discoveredPct -> identifiedPct
          const migrated = parsed.map((reg: any) => ({
            ...reg,
            identifiedPct: reg.identifiedPct ?? reg.discoveredPct ?? 0
          }))
          // Save migrated data
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
          return migrated
        }
      }
    } catch (e) {
      console.error('Failed to load registers from localStorage:', e)
    }
    
    // Initialize with fresh historical data
    console.log('Generating fresh historical data...')
    const historical = generateHistoricalRegisters()
    
    // Also generate workflows
    const workflows = generateHistoricalWorkflows(historical)
    
    // Try to save to localStorage (may fail due to quota)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historical))
      localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION)
      localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(workflows))
      console.log(`Generated and saved ${historical.length} registers and ${Object.keys(workflows).length} workflows`)
    } catch (e) {
      console.warn('Could not save to localStorage (quota exceeded?), data will be regenerated on refresh:', e)
    }
    
    return historical
  })
  
  // Check backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      const available = await registerApi.checkRegisterServiceHealth()
      setBackendAvailable(available)
    }
    checkBackend()
    // Recheck every 30 seconds
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [])
  
  // Save live mode preference
  useEffect(() => {
    try {
      localStorage.setItem('etanalytics_live_mode', String(isLiveMode))
    } catch (e) {
      console.error('Failed to save live mode preference:', e)
    }
  }, [isLiveMode])

  // Save to localStorage whenever registers change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadedRegisters))
    } catch (e) {
      console.error('Failed to save registers to localStorage:', e)
    }
  }, [uploadedRegisters])

  const addRegister = (register: UploadedRegister) => {
    setUploadedRegisters(prev => {
      // Check if already exists (by id)
      const exists = prev.some(r => r.id === register.id)
      if (exists) {
        return prev.map(r => r.id === register.id ? register : r)
      }
      return [...prev, register]
    })
  }

  const removeRegister = (id: string) => {
    setUploadedRegisters(prev => prev.filter(r => r.id !== id))
  }
  
  const clearAllRegisters = () => {
    setUploadedRegisters([])
  }

  const getRegister = (id: string) => {
    return uploadedRegisters.find(r => r.id === id)
  }
  
  const getRegistersForIssuer = (issuerId: string) => {
    return uploadedRegisters.filter(r => r.issuerId === issuerId)
  }
  
  const updateRegisterStatus = (id: string, status: UploadedRegister['status'], identifiedPct?: number) => {
    setUploadedRegisters(prev => prev.map(r => 
      r.id === id ? { ...r, status, identifiedPct: identifiedPct ?? r.identifiedPct } : r
    ))
  }
  
  const initializeWithHistoricalData = () => {
    const historical = generateHistoricalRegisters()
    setUploadedRegisters(historical)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historical))
    
    // Also regenerate workflows
    const workflows = generateHistoricalWorkflows(historical)
    localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(workflows))
  }
  
  // Fetch registers from backend API
  const fetchFromBackend = useCallback(async () => {
    if (!isBackendAvailable) {
      console.warn('Backend not available, using local data')
      return
    }
    
    try {
      const response = await registerApi.getRegisters()
      if (response && response.registers.length > 0) {
        // Convert backend registers to our format
        const converted: UploadedRegister[] = response.registers.map(reg => ({
          id: reg.id,
          issuerId: reg.issuer_id,
          issuerName: reg.issuer_id, // Backend may not have issuer name
          fileName: `Register ${reg.id}`,
          uploadDate: reg.upload_date,
          registerDate: reg.upload_date,
          totalHolders: reg.total_holders,
          status: reg.status === 'analyzed' ? 'analyzed' : reg.status === 'in_progress' ? 'in_progress' : 'pending',
          etfs: reg.etf_columns.map(col => ({
            isin: col.isin,
            name: col.name,
            totalShares: col.shares_outstanding
          })),
          nominees: reg.entries.map(entry => ({
            name: entry.account_name,
            accountNumber: entry.account_number,
            holdings: entry.holdings,
            totalShares: entry.total_shares
          }))
        }))
        
        // Merge with existing (keep mock data, add backend data)
        setUploadedRegisters(prev => {
          const mockRegisters = prev.filter(r => r.id.startsWith('reg-'))
          const backendIds = new Set(converted.map(r => r.id))
          const uniqueMock = mockRegisters.filter(r => !backendIds.has(r.id))
          return [...uniqueMock, ...converted]
        })
      }
    } catch (error) {
      console.error('Failed to fetch from backend:', error)
    }
  }, [isBackendAvailable])
  
  // Upload file to backend
  const uploadToBackend = useCallback(async (
    file: File, 
    issuerId: string, 
    issuerName: string
  ): Promise<UploadedRegister | null> => {
    if (!isBackendAvailable) {
      console.warn('Backend not available, cannot upload')
      return null
    }
    
    try {
      const response = await registerApi.uploadRegister(file, issuerId)
      if (response) {
        const newRegister: UploadedRegister = {
          id: response.register_id,
          issuerId,
          issuerName,
          fileName: file.name,
          uploadDate: new Date().toISOString().split('T')[0],
          registerDate: new Date().toISOString().split('T')[0],
          totalHolders: response.holders,
          status: 'pending',
          etfs: response.etf_columns.map(col => ({
            isin: col.isin,
            name: col.name,
            totalShares: col.shares_outstanding
          })),
          nominees: []  // Will be populated when we fetch the full register
        }
        addRegister(newRegister)
        return newRegister
      }
    } catch (error) {
      console.error('Failed to upload to backend:', error)
    }
    return null
  }, [isBackendAvailable])
  
  // Run backend analysis
  const runBackendAnalysis = useCallback(async (
    registerId: string
  ): Promise<registerApi.AnalysisResult | null> => {
    if (!isBackendAvailable) {
      console.warn('Backend not available, cannot run analysis')
      return null
    }
    
    try {
      const result = await registerApi.runAnalysis(registerId)
      if (result) {
        // Update register status with analysis results
        updateRegisterStatus(registerId, 'analyzed', result.identified_percentage)
      }
      return result
    } catch (error) {
      console.error('Failed to run backend analysis:', error)
      return null
    }
  }, [isBackendAvailable])

  return (
    <RegisterContext.Provider value={{ 
      uploadedRegisters, 
      addRegister, 
      removeRegister, 
      clearAllRegisters, 
      getRegister,
      getRegistersForIssuer,
      updateRegisterStatus,
      initializeWithHistoricalData,
      // API integration
      isLiveMode,
      setLiveMode,
      isBackendAvailable,
      fetchFromBackend,
      uploadToBackend,
      runBackendAnalysis
    }}>
      {children}
    </RegisterContext.Provider>
  )
}

export const useRegisters = () => {
  const context = useContext(RegisterContext)
  if (!context) {
    throw new Error('useRegisters must be used within a RegisterProvider')
  }
  return context
}

// Helper function to parse CSV and create a register
export const parseCSVToRegister = (
  csvContent: string,
  issuerId: string,
  issuerName: string,
  registerDate?: string  // Optional: the date the share register was issued
): UploadedRegister => {
  const lines = csvContent.trim().split('\n')
  const headers = lines[0].split(',')
  
  // First two columns are nominee name and account number, rest are ISINs
  const hasAccountNumber = headers[1]?.toLowerCase().includes('account') || headers[1]?.toLowerCase().includes('number')
  const isinStartIndex = hasAccountNumber ? 2 : 1
  const isins = headers.slice(isinStartIndex).map(h => h.trim())
  
  // Parse each nominee row
  const nominees: Array<{ name: string; accountNumber?: string; holdings: Record<string, number>; totalShares: number }> = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const nomineeName = values[0]?.trim()
    const accountNumber = hasAccountNumber ? values[1]?.trim() : undefined
    const holdings: Record<string, number> = {}
    let totalShares = 0
    
    for (let j = isinStartIndex; j < values.length; j++) {
      const isin = isins[j - isinStartIndex]?.trim()
      const shares = parseInt(values[j]) || 0
      if (isin && shares > 0) {
        holdings[isin] = shares
        totalShares += shares
      }
    }
    
    if (nomineeName && Object.keys(holdings).length > 0) {
      nominees.push({ name: nomineeName, accountNumber, holdings, totalShares })
    }
  }
  
  // Build ETF list with total shares
  const etfTotals: Record<string, number> = {}
  nominees.forEach(nom => {
    Object.entries(nom.holdings).forEach(([isin, shares]) => {
      etfTotals[isin] = (etfTotals[isin] || 0) + shares
    })
  })
  
  // Comprehensive ISIN to name mapping
  const isinToName: Record<string, string> = {
    // iShares
    'IE00B4L5Y983': 'iShares Core MSCI World UCITS ETF',
    'IE00B5BMR087': 'iShares Core S&P 500 UCITS ETF',
    'IE00B3F81R35': 'iShares Core S&P 500 UCITS ETF (Dist)',
    'IE00BKM4GZ66': 'iShares NASDAQ 100 UCITS ETF',
    'IE00B4L5YC18': 'iShares Core Euro STOXX 50 UCITS ETF',
    'IE00B52MJY50': 'iShares Core MSCI EM IMI UCITS ETF',
    'IE00B3RBWM25': 'iShares Core MSCI Emerging Markets UCITS ETF',
    'IE00B52SF786': 'iShares Core MSCI Japan IMI UCITS ETF',
    'IE00BF4RFE31': 'iShares Automation & Robotics UCITS ETF',
    'IE00B53SZB19': 'iShares Global Clean Energy UCITS ETF',
    // Vanguard
    'IE00BK5BQT80': 'Vanguard FTSE All-World UCITS ETF (Acc)',
    'IE00B3VVMM84': 'Vanguard FTSE All-World UCITS ETF (Dist)',
    'IE00B3XXRP09': 'Vanguard S&P 500 UCITS ETF (Acc)',
    'IE00BFMXXD54': 'Vanguard S&P 500 UCITS ETF (Dist)',
    'IE00BK5BQV03': 'Vanguard FTSE Developed World UCITS ETF',
    'IE00BK5BR733': 'Vanguard FTSE Emerging Markets UCITS ETF',
    'IE00B95PGT31': 'Vanguard FTSE Developed Europe UCITS ETF',
    // Amundi
    'LU1681043599': 'Amundi MSCI World UCITS ETF',
    'LU1681048804': 'Amundi S&P 500 UCITS ETF',
    'LU1135865084': 'Amundi MSCI Emerging Markets UCITS ETF',
    'LU1681038672': 'Amundi Euro STOXX 50 UCITS ETF',
  }
  
  const etfs = Object.entries(etfTotals).map(([isin, totalShares]) => ({
    isin,
    name: isinToName[isin] || `ETF ${isin.slice(-4)}`,
    totalShares
  }))
  
  const now = new Date()
  const uploadDate = now.toISOString().split('T')[0]
  const monthStr = now.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  
  return {
    id: `reg-${issuerId}-${Date.now()}`,
    issuerId,
    issuerName,
    fileName: `${issuerName} Share Register ${monthStr}.csv`,
    uploadDate,
    registerDate: registerDate || uploadDate,  // Default to upload date if not provided
    totalHolders: nominees.length,
    status: 'pending',
    etfs,
    nominees
  }
}

