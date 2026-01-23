import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'

// Share class types
export type ShareClassType = 'accumulation' | 'income'
export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY'
export type ETFCategory = 'Equity' | 'Fixed Income' | 'Commodity' | 'Multi-Asset' | 'Alternative'
export type ETFRegion = 'Global' | 'US' | 'Europe' | 'Asia' | 'Emerging Markets' | 'Japan' | 'UK'

// Historical NAV record
export interface NAVRecord {
  date: string  // ISO date
  nav: number
  sharesOutstanding: number
  aum: number  // Calculated: shares × NAV
  source: 'register' | 'manual' | 'api'
}

// Individual share class
export interface ShareClass {
  isin: string
  name: string
  type: ShareClassType
  currency: Currency
  hedged: boolean
  inceptionDate: string
  currentNav: number
  currentSharesOutstanding: number
  currentAum: number
  historicalData: NAVRecord[]
}

// ETF Product (groups multiple share classes)
export interface ETFProduct {
  id: string
  baseProductId: string
  baseName: string
  issuerId: string
  category: ETFCategory
  region: ETFRegion
  benchmark?: string
  ter?: number  // Total Expense Ratio
  shareClasses: ShareClass[]
  createdAt: string
  updatedAt: string
}

// Delivered Report structure
export interface DeliveredReport {
  id: string
  issuerId: string
  registerId: string
  registerDate: string
  deliveredAt: string
  identifiedPct: number
  totalHolders: number
  matchedHolders: number
  totalETFs: number
  totalShareClasses: number
  ownershipBreakdown: {
    type: string
    pct: number
    color: string
    aum: number
  }[]
  topHolders: {
    name: string
    type: string
    aum: number
    pct: number
    etfCount: number
  }[]
  etfBreakdown: {
    isin: string
    name: string
    identifiedPct: number
    totalShares: number
    identifiedShares: number
  }[]
}

interface ETFDatabaseContextType {
  etfProducts: ETFProduct[]
  deliveredReports: DeliveredReport[]
  addETFProduct: (product: ETFProduct) => void
  updateETFProduct: (id: string, data: Partial<ETFProduct>) => void
  addShareClass: (productId: string, shareClass: ShareClass) => void
  updateShareClass: (isin: string, data: Partial<ShareClass>) => void
  addHistoricalData: (isin: string, data: NAVRecord) => void
  getETFProduct: (id: string) => ETFProduct | undefined
  getShareClass: (isin: string) => ShareClass | undefined
  getETFsForIssuer: (issuerId: string) => ETFProduct[]
  getNAVHistory: (isin: string, startDate?: string, endDate?: string) => NAVRecord[]
  addDeliveredReport: (report: DeliveredReport) => void
  getReportsForIssuer: (issuerId: string) => DeliveredReport[]
  getLatestReport: (issuerId: string) => DeliveredReport | undefined
  getRollingAverageIdentified: (issuerId: string, reportCount?: number) => number
  calculateNNA: (isin: string, startDate: string, endDate: string) => number
}

const ETFDatabaseContext = createContext<ETFDatabaseContextType | undefined>(undefined)

const STORAGE_KEY_ETFS = 'etanalytics_etf_database'
const STORAGE_KEY_REPORTS = 'etanalytics_delivered_reports'

// Generate sample ETF products - Comprehensive database with all Yahoo Finance mapped ISINs
const generateSampleETFProducts = (): ETFProduct[] => {
  const now = new Date().toISOString()
  
  // ═══════════════════════════════════════════════════════════════════════════
  // iShares (BlackRock) ETFs - 24 ISINs
  // ═══════════════════════════════════════════════════════════════════════════
  const blackrockETFs: Omit<ETFProduct, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'etf-ishares-001',
      baseProductId: 'ishares-core-msci-world',
      baseName: 'iShares Core MSCI World UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'Global',
      benchmark: 'MSCI World Index',
      ter: 0.20,
      shareClasses: [
        { isin: 'IE00B4L5Y983', name: 'iShares Core MSCI World UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2009-09-25', currentNav: 114.78, currentSharesOutstanding: 856000000, currentAum: 98251680000, historicalData: generateHistoricalNAV(114.78, 856000000, 365) },
        { isin: 'IE00B4L5YV89', name: 'iShares Core MSCI World UCITS ETF USD (Acc) - LSE', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2009-09-25', currentNav: 96.45, currentSharesOutstanding: 245000000, currentAum: 23630250000, historicalData: generateHistoricalNAV(96.45, 245000000, 365) },
        { isin: 'IE00B0M62Q58', name: 'iShares MSCI World UCITS ETF USD (Dist)', type: 'income', currency: 'USD', hedged: false, inceptionDate: '2005-10-28', currentNav: 62.34, currentSharesOutstanding: 145000000, currentAum: 9039300000, historicalData: generateHistoricalNAV(62.34, 145000000, 365) },
        { isin: 'IE00B4L5YX21', name: 'iShares Core MSCI World UCITS ETF USD (Swap)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2012-03-15', currentNav: 78.92, currentSharesOutstanding: 89000000, currentAum: 7023880000, historicalData: generateHistoricalNAV(78.92, 89000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-002',
      baseProductId: 'ishares-core-sp500',
      baseName: 'iShares Core S&P 500 UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'US',
      benchmark: 'S&P 500 Index',
      ter: 0.07,
      shareClasses: [
        { isin: 'IE00B5BMR087', name: 'iShares Core S&P 500 UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2010-05-19', currentNav: 745.18, currentSharesOutstanding: 245000000, currentAum: 182569100000, historicalData: generateHistoricalNAV(745.18, 245000000, 365) },
        { isin: 'IE00B3F81R35', name: 'iShares Core S&P 500 UCITS ETF USD (Dist)', type: 'income', currency: 'USD', hedged: false, inceptionDate: '2010-05-19', currentNav: 51.72, currentSharesOutstanding: 189000000, currentAum: 9775080000, historicalData: generateHistoricalNAV(51.72, 189000000, 365) },
        { isin: 'IE00B02KXH56', name: 'iShares S&P 500 UCITS ETF USD (Dist)', type: 'income', currency: 'USD', hedged: false, inceptionDate: '2002-03-15', currentNav: 48.45, currentSharesOutstanding: 125000000, currentAum: 6056250000, historicalData: generateHistoricalNAV(48.45, 125000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-003',
      baseProductId: 'ishares-nasdaq100',
      baseName: 'iShares NASDAQ 100 UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'US',
      benchmark: 'NASDAQ 100 Index',
      ter: 0.33,
      shareClasses: [
        { isin: 'IE00BKM4GZ66', name: 'iShares NASDAQ 100 UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2010-01-26', currentNav: 1466.20, currentSharesOutstanding: 45000000, currentAum: 65979000000, historicalData: generateHistoricalNAV(1466.20, 45000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-004',
      baseProductId: 'ishares-euro-stoxx50',
      baseName: 'iShares Core Euro STOXX 50 UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'Europe',
      benchmark: 'Euro STOXX 50 Index',
      ter: 0.10,
      shareClasses: [
        { isin: 'IE00B4L5YC18', name: 'iShares Core Euro STOXX 50 UCITS ETF EUR (Acc)', type: 'accumulation', currency: 'EUR', hedged: false, inceptionDate: '2010-01-26', currentNav: 199.24, currentSharesOutstanding: 57312000, currentAum: 11418838880, historicalData: generateHistoricalNAV(199.24, 57312000, 365) }
      ]
    },
    {
      id: 'etf-ishares-005',
      baseProductId: 'ishares-msci-europe',
      baseName: 'iShares MSCI Europe UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'Europe',
      benchmark: 'MSCI Europe Index',
      ter: 0.12,
      shareClasses: [
        { isin: 'IE00B14X4M10', name: 'iShares Core MSCI Europe UCITS ETF EUR (Dist)', type: 'income', currency: 'EUR', hedged: false, inceptionDate: '2007-01-19', currentNav: 32.45, currentSharesOutstanding: 124000000, currentAum: 4023800000, historicalData: generateHistoricalNAV(32.45, 124000000, 365) },
        { isin: 'IE00B0M63177', name: 'iShares MSCI Europe UCITS ETF EUR (Acc)', type: 'accumulation', currency: 'EUR', hedged: false, inceptionDate: '2005-11-18', currentNav: 28.67, currentSharesOutstanding: 89000000, currentAum: 2551630000, historicalData: generateHistoricalNAV(28.67, 89000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-006',
      baseProductId: 'ishares-em-imi',
      baseName: 'iShares Core MSCI EM IMI UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'Emerging Markets',
      benchmark: 'MSCI EM IMI Index',
      ter: 0.18,
      shareClasses: [
        { isin: 'IE00B52MJY50', name: 'iShares Core MSCI EM IMI UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2014-05-30', currentNav: 32.78, currentSharesOutstanding: 285000000, currentAum: 9342300000, historicalData: generateHistoricalNAV(32.78, 285000000, 365) },
        { isin: 'IE00B52MJD48', name: 'iShares Core MSCI EM IMI UCITS ETF USD (Dist)', type: 'income', currency: 'USD', hedged: false, inceptionDate: '2014-05-30', currentNav: 28.45, currentSharesOutstanding: 95000000, currentAum: 2702750000, historicalData: generateHistoricalNAV(28.45, 95000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-007',
      baseProductId: 'ishares-msci-em',
      baseName: 'iShares Core MSCI Emerging Markets UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'Emerging Markets',
      benchmark: 'MSCI Emerging Markets Index',
      ter: 0.18,
      shareClasses: [
        { isin: 'IE00B3RBWM25', name: 'iShares Core MSCI Emerging Markets UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2014-05-30', currentNav: 55.12, currentSharesOutstanding: 168237000, currentAum: 9273145440, historicalData: generateHistoricalNAV(55.12, 168237000, 365) }
      ]
    },
    {
      id: 'etf-ishares-008',
      baseProductId: 'ishares-japan-imi',
      baseName: 'iShares Core MSCI Japan IMI UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'Japan',
      benchmark: 'MSCI Japan IMI Index',
      ter: 0.15,
      shareClasses: [
        { isin: 'IE00B52SF786', name: 'iShares Core MSCI Japan IMI UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2010-01-26', currentNav: 78.34, currentSharesOutstanding: 45000000, currentAum: 3525300000, historicalData: generateHistoricalNAV(78.34, 45000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-009',
      baseProductId: 'ishares-pacific-ex-japan',
      baseName: 'iShares Core MSCI Pacific ex Japan UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'Asia',
      benchmark: 'MSCI Pacific ex Japan Index',
      ter: 0.20,
      shareClasses: [
        { isin: 'IE00B4K48X80', name: 'iShares Core MSCI Pacific ex Japan UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2010-01-26', currentNav: 52.18, currentSharesOutstanding: 32000000, currentAum: 1669760000, historicalData: generateHistoricalNAV(52.18, 32000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-010',
      baseProductId: 'ishares-automation-robotics',
      baseName: 'iShares Automation & Robotics UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'Global',
      benchmark: 'iStoxx Automation & Robotics Index',
      ter: 0.40,
      shareClasses: [
        { isin: 'IE00BF4RFE31', name: 'iShares Automation & Robotics UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2016-09-08', currentNav: 17.15, currentSharesOutstanding: 124000000, currentAum: 2126600000, historicalData: generateHistoricalNAV(17.15, 124000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-011',
      baseProductId: 'ishares-clean-energy',
      baseName: 'iShares Global Clean Energy UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'Global',
      benchmark: 'S&P Global Clean Energy Index',
      ter: 0.65,
      shareClasses: [
        { isin: 'IE00B53SZB19', name: 'iShares Global Clean Energy UCITS ETF USD (Dist)', type: 'income', currency: 'GBP', hedged: false, inceptionDate: '2007-07-06', currentNav: 7.61, currentSharesOutstanding: 485000000, currentAum: 3690850000, historicalData: generateHistoricalNAV(7.61, 485000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-012',
      baseProductId: 'ishares-digitalisation',
      baseName: 'iShares Digitalisation UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'Global',
      benchmark: 'iStoxx Digitalisation Index',
      ter: 0.40,
      shareClasses: [
        { isin: 'IE00BYVJRR92', name: 'iShares Digitalisation UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2016-09-08', currentNav: 12.34, currentSharesOutstanding: 68000000, currentAum: 839120000, historicalData: generateHistoricalNAV(12.34, 68000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-013',
      baseProductId: 'ishares-healthcare-innovation',
      baseName: 'iShares Healthcare Innovation UCITS ETF',
      issuerId: 'blackrock',
      category: 'Equity',
      region: 'Global',
      benchmark: 'iStoxx Healthcare Innovation Index',
      ter: 0.40,
      shareClasses: [
        { isin: 'IE00BKWQ0D84', name: 'iShares Healthcare Innovation UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2016-09-08', currentNav: 8.92, currentSharesOutstanding: 45000000, currentAum: 401400000, historicalData: generateHistoricalNAV(8.92, 45000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-014',
      baseProductId: 'ishares-treasury-7-10',
      baseName: 'iShares USD Treasury Bond 7-10yr UCITS ETF',
      issuerId: 'blackrock',
      category: 'Fixed Income',
      region: 'US',
      benchmark: 'ICE US Treasury 7-10 Year Bond Index',
      ter: 0.07,
      shareClasses: [
        { isin: 'IE00B4WXJJ64', name: 'iShares USD Treasury Bond 7-10yr UCITS ETF USD (Dist)', type: 'income', currency: 'USD', hedged: false, inceptionDate: '2009-01-27', currentNav: 145.67, currentSharesOutstanding: 85000000, currentAum: 12381950000, historicalData: generateHistoricalNAV(145.67, 85000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-015',
      baseProductId: 'ishares-treasury-1-3',
      baseName: 'iShares USD Treasury Bond 1-3yr UCITS ETF',
      issuerId: 'blackrock',
      category: 'Fixed Income',
      region: 'US',
      benchmark: 'ICE US Treasury 1-3 Year Bond Index',
      ter: 0.07,
      shareClasses: [
        { isin: 'IE00B66F4759', name: 'iShares USD Treasury Bond 1-3yr UCITS ETF USD (Dist)', type: 'income', currency: 'USD', hedged: false, inceptionDate: '2009-01-27', currentNav: 112.34, currentSharesOutstanding: 125000000, currentAum: 14042500000, historicalData: generateHistoricalNAV(112.34, 125000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-016',
      baseProductId: 'ishares-eur-corp-bond',
      baseName: 'iShares Core EUR Corp Bond UCITS ETF',
      issuerId: 'blackrock',
      category: 'Fixed Income',
      region: 'Europe',
      benchmark: 'Bloomberg Euro Corporate Bond Index',
      ter: 0.20,
      shareClasses: [
        { isin: 'IE00B1YZSC51', name: 'iShares Core EUR Corp Bond UCITS ETF EUR (Dist)', type: 'income', currency: 'EUR', hedged: false, inceptionDate: '2009-09-15', currentNav: 124.56, currentSharesOutstanding: 98000000, currentAum: 12206880000, historicalData: generateHistoricalNAV(124.56, 98000000, 365) }
      ]
    },
    {
      id: 'etf-ishares-017',
      baseProductId: 'ishares-usd-corp-bond',
      baseName: 'iShares USD Corp Bond UCITS ETF',
      issuerId: 'blackrock',
      category: 'Fixed Income',
      region: 'US',
      benchmark: 'Markit iBoxx USD Liquid Investment Grade Index',
      ter: 0.20,
      shareClasses: [
        { isin: 'IE00BKX55T58', name: 'iShares USD Corp Bond UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2014-09-23', currentNav: 98.23, currentSharesOutstanding: 78000000, currentAum: 7661940000, historicalData: generateHistoricalNAV(98.23, 78000000, 365) },
        { isin: 'IE00B0M63516', name: 'iShares $ Corp Bond UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2003-03-25', currentNav: 104.56, currentSharesOutstanding: 125000000, currentAum: 13070000000, historicalData: generateHistoricalNAV(104.56, 125000000, 365) }
      ]
    }
  ]
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Vanguard ETFs - 9 ISINs
  // ═══════════════════════════════════════════════════════════════════════════
  const vanguardETFs: Omit<ETFProduct, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'etf-vanguard-001',
      baseProductId: 'vanguard-ftse-allworld',
      baseName: 'Vanguard FTSE All-World UCITS ETF',
      issuerId: 'vanguard',
      category: 'Equity',
      region: 'Global',
      benchmark: 'FTSE All-World Index',
      ter: 0.22,
      shareClasses: [
        { isin: 'IE00BK5BQT80', name: 'Vanguard FTSE All-World UCITS ETF USD (Acc)', type: 'accumulation', currency: 'EUR', hedged: false, inceptionDate: '2019-07-23', currentNav: 149.90, currentSharesOutstanding: 251622000, currentAum: 37718177800, historicalData: generateHistoricalNAV(149.90, 251622000, 365) },
        { isin: 'IE00B3VVMM84', name: 'Vanguard FTSE All-World UCITS ETF USD (Dist)', type: 'income', currency: 'GBP', hedged: false, inceptionDate: '2012-05-22', currentNav: 126.82, currentSharesOutstanding: 185000000, currentAum: 23461700000, historicalData: generateHistoricalNAV(126.82, 185000000, 365) }
      ]
    },
    {
      id: 'etf-vanguard-002',
      baseProductId: 'vanguard-sp500',
      baseName: 'Vanguard S&P 500 UCITS ETF',
      issuerId: 'vanguard',
      category: 'Equity',
      region: 'US',
      benchmark: 'S&P 500 Index',
      ter: 0.07,
      shareClasses: [
        { isin: 'IE00B3XXRP09', name: 'Vanguard S&P 500 UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2019-02-13', currentNav: 133.62, currentSharesOutstanding: 185400000, currentAum: 24773148000, historicalData: generateHistoricalNAV(133.62, 185400000, 365) },
        { isin: 'IE00BFMXXD54', name: 'Vanguard S&P 500 UCITS ETF USD (Dist)', type: 'income', currency: 'USD', hedged: false, inceptionDate: '2012-05-22', currentNav: 78.45, currentSharesOutstanding: 245000000, currentAum: 19220250000, historicalData: generateHistoricalNAV(78.45, 245000000, 365) }
      ]
    },
    {
      id: 'etf-vanguard-003',
      baseProductId: 'vanguard-developed-world',
      baseName: 'Vanguard FTSE Developed World UCITS ETF',
      issuerId: 'vanguard',
      category: 'Equity',
      region: 'Global',
      benchmark: 'FTSE Developed Index',
      ter: 0.12,
      shareClasses: [
        { isin: 'IE00BK5BQV03', name: 'Vanguard FTSE Developed World UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2019-09-24', currentNav: 98.34, currentSharesOutstanding: 125000000, currentAum: 12292500000, historicalData: generateHistoricalNAV(98.34, 125000000, 365) },
        { isin: 'IE00B945VV12', name: 'Vanguard FTSE Developed World UCITS ETF USD (Dist)', type: 'income', currency: 'USD', hedged: false, inceptionDate: '2014-06-25', currentNav: 82.67, currentSharesOutstanding: 95000000, currentAum: 7853650000, historicalData: generateHistoricalNAV(82.67, 95000000, 365) }
      ]
    },
    {
      id: 'etf-vanguard-004',
      baseProductId: 'vanguard-em',
      baseName: 'Vanguard FTSE Emerging Markets UCITS ETF',
      issuerId: 'vanguard',
      category: 'Equity',
      region: 'Emerging Markets',
      benchmark: 'FTSE Emerging Index',
      ter: 0.22,
      shareClasses: [
        { isin: 'IE00BK5BR733', name: 'Vanguard FTSE Emerging Markets UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2019-09-24', currentNav: 58.92, currentSharesOutstanding: 85000000, currentAum: 5008200000, historicalData: generateHistoricalNAV(58.92, 85000000, 365) }
      ]
    },
    {
      id: 'etf-vanguard-005',
      baseProductId: 'vanguard-japan',
      baseName: 'Vanguard FTSE Japan UCITS ETF',
      issuerId: 'vanguard',
      category: 'Equity',
      region: 'Japan',
      benchmark: 'FTSE Japan Index',
      ter: 0.15,
      shareClasses: [
        { isin: 'IE00BKX55R35', name: 'Vanguard FTSE Japan UCITS ETF USD (Dist)', type: 'income', currency: 'USD', hedged: false, inceptionDate: '2019-02-13', currentNav: 32.45, currentSharesOutstanding: 65000000, currentAum: 2109250000, historicalData: generateHistoricalNAV(32.45, 65000000, 365) }
      ]
    },
    {
      id: 'etf-vanguard-006',
      baseProductId: 'vanguard-europe',
      baseName: 'Vanguard FTSE Developed Europe UCITS ETF',
      issuerId: 'vanguard',
      category: 'Equity',
      region: 'Europe',
      benchmark: 'FTSE Developed Europe Index',
      ter: 0.10,
      shareClasses: [
        { isin: 'IE00B95PGT31', name: 'Vanguard FTSE Developed Europe UCITS ETF EUR (Dist)', type: 'income', currency: 'EUR', hedged: false, inceptionDate: '2014-05-21', currentNav: 38.92, currentSharesOutstanding: 125000000, currentAum: 4865000000, historicalData: generateHistoricalNAV(38.92, 125000000, 365) }
      ]
    }
  ]
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Amundi ETFs - 5 ISINs (Luxembourg domiciled)
  // ═══════════════════════════════════════════════════════════════════════════
  const amundiETFs: Omit<ETFProduct, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'etf-amundi-001',
      baseProductId: 'amundi-msci-world',
      baseName: 'Amundi MSCI World UCITS ETF',
      issuerId: 'amundi',
      category: 'Equity',
      region: 'Global',
      benchmark: 'MSCI World Index',
      ter: 0.18,
      shareClasses: [
        { isin: 'LU1681043599', name: 'Amundi MSCI World UCITS ETF EUR (Acc)', type: 'accumulation', currency: 'EUR', hedged: false, inceptionDate: '2018-02-21', currentNav: 625.24, currentSharesOutstanding: 26952000, currentAum: 16850667480, historicalData: generateHistoricalNAV(625.24, 26952000, 365) },
        { isin: 'LU1437016972', name: 'Amundi MSCI World UCITS ETF DR EUR (Acc)', type: 'accumulation', currency: 'EUR', hedged: false, inceptionDate: '2016-12-12', currentNav: 412.56, currentSharesOutstanding: 18500000, currentAum: 7632360000, historicalData: generateHistoricalNAV(412.56, 18500000, 365) }
      ]
    },
    {
      id: 'etf-amundi-002',
      baseProductId: 'amundi-sp500',
      baseName: 'Amundi S&P 500 UCITS ETF',
      issuerId: 'amundi',
      category: 'Equity',
      region: 'US',
      benchmark: 'S&P 500 Index',
      ter: 0.15,
      shareClasses: [
        { isin: 'LU1681048804', name: 'Amundi S&P 500 UCITS ETF EUR (Acc)', type: 'accumulation', currency: 'EUR', hedged: false, inceptionDate: '2018-02-21', currentNav: 542.18, currentSharesOutstanding: 32458000, currentAum: 17601073240, historicalData: generateHistoricalNAV(542.18, 32458000, 365) }
      ]
    },
    {
      id: 'etf-amundi-003',
      baseProductId: 'amundi-em',
      baseName: 'Amundi MSCI Emerging Markets UCITS ETF',
      issuerId: 'amundi',
      category: 'Equity',
      region: 'Emerging Markets',
      benchmark: 'MSCI Emerging Markets Index',
      ter: 0.20,
      shareClasses: [
        { isin: 'LU1135865084', name: 'Amundi MSCI Emerging Markets UCITS ETF EUR (Acc)', type: 'accumulation', currency: 'EUR', hedged: false, inceptionDate: '2015-04-16', currentNav: 8.45, currentSharesOutstanding: 468237000, currentAum: 3956602650, historicalData: generateHistoricalNAV(8.45, 468237000, 365) }
      ]
    },
    {
      id: 'etf-amundi-004',
      baseProductId: 'amundi-euro-stoxx50',
      baseName: 'Amundi Euro STOXX 50 UCITS ETF',
      issuerId: 'amundi',
      category: 'Equity',
      region: 'Europe',
      benchmark: 'Euro STOXX 50 Index',
      ter: 0.09,
      shareClasses: [
        { isin: 'LU1681038672', name: 'Amundi Euro STOXX 50 UCITS ETF EUR (Acc)', type: 'accumulation', currency: 'EUR', hedged: false, inceptionDate: '2018-02-21', currentNav: 142.65, currentSharesOutstanding: 57312000, currentAum: 8175676800, historicalData: generateHistoricalNAV(142.65, 57312000, 365) }
      ]
    }
  ]
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Other Providers (Invesco, SPDR, Xtrackers) - 6 ISINs
  // ═══════════════════════════════════════════════════════════════════════════
  const otherETFs: Omit<ETFProduct, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'etf-invesco-001',
      baseProductId: 'invesco-nasdaq100',
      baseName: 'Invesco EQQQ NASDAQ-100 UCITS ETF',
      issuerId: 'invesco',
      category: 'Equity',
      region: 'US',
      benchmark: 'NASDAQ 100 Index',
      ter: 0.30,
      shareClasses: [
        { isin: 'IE00B3YCGJ38', name: 'Invesco EQQQ NASDAQ-100 UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2002-12-02', currentNav: 482.34, currentSharesOutstanding: 45000000, currentAum: 21705300000, historicalData: generateHistoricalNAV(482.34, 45000000, 365) }
      ]
    },
    {
      id: 'etf-invesco-002',
      baseProductId: 'invesco-sp500',
      baseName: 'Invesco S&P 500 UCITS ETF',
      issuerId: 'invesco',
      category: 'Equity',
      region: 'US',
      benchmark: 'S&P 500 Index',
      ter: 0.05,
      shareClasses: [
        { isin: 'IE00BFYN8Y92', name: 'Invesco S&P 500 UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2019-05-16', currentNav: 892.45, currentSharesOutstanding: 25000000, currentAum: 22311250000, historicalData: generateHistoricalNAV(892.45, 25000000, 365) }
      ]
    },
    {
      id: 'etf-spdr-001',
      baseProductId: 'spdr-sp500',
      baseName: 'SPDR S&P 500 UCITS ETF',
      issuerId: 'spdr',
      category: 'Equity',
      region: 'US',
      benchmark: 'S&P 500 Index',
      ter: 0.03,
      shareClasses: [
        { isin: 'IE00B6YX5C33', name: 'SPDR S&P 500 UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2012-11-20', currentNav: 523.67, currentSharesOutstanding: 85000000, currentAum: 44511950000, historicalData: generateHistoricalNAV(523.67, 85000000, 365) }
      ]
    },
    {
      id: 'etf-spdr-002',
      baseProductId: 'spdr-msci-world',
      baseName: 'SPDR MSCI World UCITS ETF',
      issuerId: 'spdr',
      category: 'Equity',
      region: 'Global',
      benchmark: 'MSCI World Index',
      ter: 0.12,
      shareClasses: [
        { isin: 'IE00B44Z5B48', name: 'SPDR MSCI World UCITS ETF USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2011-02-28', currentNav: 42.67, currentSharesOutstanding: 165000000, currentAum: 7040550000, historicalData: generateHistoricalNAV(42.67, 165000000, 365) }
      ]
    },
    {
      id: 'etf-xtrackers-001',
      baseProductId: 'xtrackers-msci-world',
      baseName: 'Xtrackers MSCI World UCITS ETF',
      issuerId: 'xtrackers',
      category: 'Equity',
      region: 'Global',
      benchmark: 'MSCI World Index',
      ter: 0.19,
      shareClasses: [
        { isin: 'IE00BJ0KDQ92', name: 'Xtrackers MSCI World UCITS ETF 1C USD (Acc)', type: 'accumulation', currency: 'USD', hedged: false, inceptionDate: '2014-07-22', currentNav: 102.34, currentSharesOutstanding: 125000000, currentAum: 12792500000, historicalData: generateHistoricalNAV(102.34, 125000000, 365) },
        { isin: 'IE00BM67HT60', name: 'Xtrackers MSCI World UCITS ETF 1D USD (Dist)', type: 'income', currency: 'USD', hedged: false, inceptionDate: '2019-01-23', currentNav: 45.67, currentSharesOutstanding: 65000000, currentAum: 2968550000, historicalData: generateHistoricalNAV(45.67, 65000000, 365) }
      ]
    }
  ]
  
  return [
    ...blackrockETFs.map(etf => ({ ...etf, createdAt: now, updatedAt: now })),
    ...vanguardETFs.map(etf => ({ ...etf, createdAt: now, updatedAt: now })),
    ...amundiETFs.map(etf => ({ ...etf, createdAt: now, updatedAt: now })),
    ...otherETFs.map(etf => ({ ...etf, createdAt: now, updatedAt: now }))
  ]
}

// Generate historical NAV data
function generateHistoricalNAV(currentNAV: number, currentShares: number, days: number): NAVRecord[] {
  const records: NAVRecord[] = []
  const now = new Date()
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86400000)
    // Add some realistic volatility
    const volatility = (Math.random() - 0.5) * 0.02
    const trend = (days - i) / days * 0.1 // Slight upward trend
    const nav = currentNAV * (1 - trend + volatility)
    const sharesChange = Math.floor((Math.random() - 0.3) * currentShares * 0.001) // Slight growth in shares
    const shares = Math.max(currentShares - sharesChange * (days - i) / 10, currentShares * 0.8)
    
    records.push({
      date: date.toISOString().split('T')[0],
      nav: Math.round(nav * 100) / 100,
      sharesOutstanding: Math.round(shares),
      aum: Math.round(nav * shares),
      source: 'api'
    })
  }
  
  return records
}

// Decision maker types - these are terminal entities at the end of custody chains
const DECISION_MAKER_TYPES = [
  'wealth_manager', 'private_bank', 'platform', 'asset_manager', 'pension_fund',
  'insurance', 'fund_of_funds', 'institution', 'family_office',
  'Wealth Manager', 'Private Bank', 'Asset Manager', 'Execution Platform',
  'Pension Fund', 'Family Office', 'Institution'
]

// Helper to get entity type label for ownership breakdown
const getEntityTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'wealth_manager': 'Wealth Managers',
    'private_bank': 'Private Banks',
    'platform': 'Platforms',
    'asset_manager': 'Asset Managers',
    'pension_fund': 'Institutions',
    'insurance': 'Institutions',
    'institution': 'Institutions',
    'family_office': 'Family Offices',
    'fund_of_funds': 'Asset Managers'
  }
  return typeMap[type.toLowerCase()] || type
}

// Tree traversal to collect terminal decision makers (avoid double-counting)
interface TreeNode {
  name: string
  type?: string
  holdings: Record<string, number>
  children: TreeNode[]
  isTerminal?: boolean
}

const collectTerminalDMs = (tree: TreeNode | undefined): Array<{ name: string; type: string; shares: number }> => {
  if (!tree) return []
  const results: Array<{ name: string; type: string; shares: number }> = []
  
  function traverse(node: TreeNode) {
    const nodeType = node.type?.toLowerCase() || ''
    const isDecisionMaker = DECISION_MAKER_TYPES.some(t => 
      nodeType === t.toLowerCase() || node.type === t
    )
    
    if (isDecisionMaker || (node.isTerminal && node.children.length === 0)) {
      const shares = Object.values(node.holdings).reduce((sum, s) => sum + s, 0)
      if (shares > 0) {
        results.push({ name: node.name, type: node.type || 'unknown', shares })
      }
    } else if (node.children && node.children.length > 0) {
      node.children.forEach(traverse)
    }
  }
  
  traverse(tree)
  return results
}

// Generate reports from actual register/workflow data in localStorage
const generateReportsFromRegisters = (): DeliveredReport[] => {
  const reports: DeliveredReport[] = []
  
  try {
    // Load registers from localStorage
    const registersJson = localStorage.getItem('etanalytics_registers')
    const workflowsJson = localStorage.getItem('etanalytics_workflows')
    
    if (!registersJson) return []
    
    const registers = JSON.parse(registersJson) as Array<{
      id: string
      issuerId: string
      issuerName: string
      status: string
      uploadDate: string
      registerDate?: string
      identifiedPct?: number
      nominees: Array<{
        name: string
        type?: string
        holdings: Record<string, number>
        tree?: TreeNode
      }>
      etfs: Array<{ isin: string; name: string; totalShares: number }>
    }>
    
    const workflows = workflowsJson ? JSON.parse(workflowsJson) : {}
    
    // Only create reports for delivered registers
    const deliveredRegisters = registers.filter(r => r.status === 'delivered')
    
    const typeColors: Record<string, string> = {
      'Wealth Managers': '#22c56d',
      'Platforms': '#32a6ff',
      'Private Banks': '#8b5cf6',
      'Asset Managers': '#f59e0b',
      'Family Offices': '#ec4899',
      'Institutions': '#06b6d4',
      'Unidentified': '#475569'
    }
    
    deliveredRegisters.forEach(register => {
      const workflow = workflows[register.id]
      
      // Calculate total shares from register
      let totalShares = 0
      register.nominees.forEach(nominee => {
        const nomineeTotal = Object.values(nominee.holdings || {}).reduce((sum, s) => sum + s, 0)
        totalShares += nomineeTotal
      })
      
      // Use workflow's etfData which has already calculated the identified decision makers
      // This ensures consistency with the workflow's identifiedPct
      let totalIdentifiedShares = 0
      const allClients: Map<string, { name: string; shares: number }> = new Map()
      
      if (workflow?.etfData) {
        workflow.etfData.forEach((etf: any) => {
          totalIdentifiedShares += etf.identifiedShares || 0
          
          // Collect clients from each ETF
          if (etf.clients) {
            etf.clients.forEach((client: any) => {
              const existing = allClients.get(client.name)
              if (existing) {
                existing.shares += client.shares
              } else {
                allClients.set(client.name, { name: client.name, shares: client.shares })
              }
            })
          }
        })
      }
      
      // Build ownership breakdown - use register's identifiedPct to determine identified vs unidentified
      const identifiedPct = workflow?.identifiedPct ?? register.identifiedPct ?? 92
      const identifiedSharesFromPct = totalShares * (identifiedPct / 100)
      const unidentifiedSharesFromPct = totalShares - identifiedSharesFromPct
      
      // Create breakdown based on typical client type distribution
      // In a real implementation, this would come from actual tree traversal results
      const ownershipBreakdown = [
        { type: 'Wealth Managers', pct: Math.round(identifiedPct * 0.35 * 10) / 10, color: typeColors['Wealth Managers'], aum: identifiedSharesFromPct * 0.35 * 50 },
        { type: 'Platforms', pct: Math.round(identifiedPct * 0.25 * 10) / 10, color: typeColors['Platforms'], aum: identifiedSharesFromPct * 0.25 * 50 },
        { type: 'Private Banks', pct: Math.round(identifiedPct * 0.18 * 10) / 10, color: typeColors['Private Banks'], aum: identifiedSharesFromPct * 0.18 * 50 },
        { type: 'Asset Managers', pct: Math.round(identifiedPct * 0.12 * 10) / 10, color: typeColors['Asset Managers'], aum: identifiedSharesFromPct * 0.12 * 50 },
        { type: 'Institutions', pct: Math.round(identifiedPct * 0.06 * 10) / 10, color: typeColors['Institutions'], aum: identifiedSharesFromPct * 0.06 * 50 },
        { type: 'Family Offices', pct: Math.round(identifiedPct * 0.04 * 10) / 10, color: typeColors['Family Offices'], aum: identifiedSharesFromPct * 0.04 * 50 },
        { type: 'Unidentified', pct: Math.round((100 - identifiedPct) * 10) / 10, color: typeColors['Unidentified'], aum: unidentifiedSharesFromPct * 50 }
      ].filter(item => item.pct > 0).sort((a, b) => b.pct - a.pct)
      
      // Build top holders from workflow clients or use sample data
      const topHolders = Array.from(allClients.values())
        .sort((a, b) => b.shares - a.shares)
        .slice(0, 10)
        .map(h => ({
          name: h.name,
          type: 'Wealth Manager',
          pct: totalShares > 0 ? Math.round((h.shares / totalShares) * 1000) / 10 : 0,
          aum: h.shares * 50,
          etfCount: register.etfs.length
        }))
      
      reports.push({
        id: register.id, // Use register ID as report ID
        issuerId: register.issuerId,
        registerId: register.id,
        registerDate: register.registerDate || register.uploadDate,
        deliveredAt: register.uploadDate,
        identifiedPct,
        totalHolders: register.nominees.length,
        matchedHolders: workflow?.matchedCount || Math.floor(register.nominees.length * 0.85),
        totalETFs: register.etfs.length,
        totalShareClasses: register.etfs.length,
        ownershipBreakdown,
        topHolders,
        etfBreakdown: []
      })
    })
    
    // Sort by delivery date (newest first)
    reports.sort((a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime())
    
  } catch (e) {
    console.error('Failed to generate reports from registers:', e)
  }
  
  return reports
}

export const ETFDatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [etfProducts, setEtfProducts] = useState<ETFProduct[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ETFS)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) return parsed
      }
    } catch (e) {
      console.error('Failed to load ETF database:', e)
    }
    return generateSampleETFProducts()
  })

  const [deliveredReports, setDeliveredReports] = useState<DeliveredReport[]>(() => {
    // Always generate fresh reports from register/workflow data
    // This ensures reports match the actual register data
    return generateReportsFromRegisters()
  })

  // Regenerate reports after workflows are available (timing fix)
  // This handles the case where ETFDatabaseProvider initializes before workflows are saved
  useEffect(() => {
    const timer = setTimeout(() => {
      const freshReports = generateReportsFromRegisters()
      if (freshReports.length > 0) {
        setDeliveredReports(freshReports)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ETFS, JSON.stringify(etfProducts))
    } catch (e) {
      console.error('Failed to save ETF database:', e)
    }
  }, [etfProducts])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(deliveredReports))
    } catch (e) {
      console.error('Failed to save reports:', e)
    }
  }, [deliveredReports])

  const addETFProduct = (product: ETFProduct) => {
    setEtfProducts(prev => [...prev, product])
  }

  const updateETFProduct = (id: string, data: Partial<ETFProduct>) => {
    setEtfProducts(prev =>
      prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)
    )
  }

  const addShareClass = (productId: string, shareClass: ShareClass) => {
    setEtfProducts(prev =>
      prev.map(p => p.id === productId 
        ? { ...p, shareClasses: [...p.shareClasses, shareClass], updatedAt: new Date().toISOString() }
        : p
      )
    )
  }

  const updateShareClass = (isin: string, data: Partial<ShareClass>) => {
    setEtfProducts(prev =>
      prev.map(p => ({
        ...p,
        shareClasses: p.shareClasses.map(sc => 
          sc.isin === isin ? { ...sc, ...data } : sc
        ),
        updatedAt: new Date().toISOString()
      }))
    )
  }

  const addHistoricalData = (isin: string, data: NAVRecord) => {
    setEtfProducts(prev =>
      prev.map(p => ({
        ...p,
        shareClasses: p.shareClasses.map(sc =>
          sc.isin === isin 
            ? { ...sc, historicalData: [...sc.historicalData, data].sort((a, b) => 
                new Date(a.date).getTime() - new Date(b.date).getTime()
              )}
            : sc
        )
      }))
    )
  }

  const getETFProduct = (id: string): ETFProduct | undefined => {
    return etfProducts.find(p => p.id === id)
  }

  const getShareClass = (isin: string): ShareClass | undefined => {
    for (const product of etfProducts) {
      const shareClass = product.shareClasses.find(sc => sc.isin === isin)
      if (shareClass) return shareClass
    }
    return undefined
  }

  const getETFsForIssuer = (issuerId: string): ETFProduct[] => {
    return etfProducts.filter(p => p.issuerId === issuerId)
  }

  const getNAVHistory = (isin: string, startDate?: string, endDate?: string): NAVRecord[] => {
    const shareClass = getShareClass(isin)
    if (!shareClass) return []

    let history = shareClass.historicalData
    
    if (startDate) {
      history = history.filter(h => h.date >= startDate)
    }
    if (endDate) {
      history = history.filter(h => h.date <= endDate)
    }
    
    return history
  }

  const addDeliveredReport = (report: DeliveredReport) => {
    setDeliveredReports(prev => [report, ...prev])
  }

  const getReportsForIssuer = (issuerId: string): DeliveredReport[] => {
    return deliveredReports
      .filter(r => r.issuerId === issuerId)
      .sort((a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime())
  }

  const getLatestReport = (issuerId: string): DeliveredReport | undefined => {
    const reports = getReportsForIssuer(issuerId)
    return reports[0]
  }

  const getRollingAverageIdentified = (issuerId: string, reportCount = 5): number => {
    const reports = getReportsForIssuer(issuerId).slice(0, reportCount)
    if (reports.length === 0) return 0
    
    const sum = reports.reduce((acc, r) => acc + r.identifiedPct, 0)
    return Math.round((sum / reports.length) * 10) / 10
  }

  const calculateNNA = (isin: string, startDate: string, endDate: string): number => {
    const history = getNAVHistory(isin, startDate, endDate)
    if (history.length < 2) return 0

    const startRecord = history[0]
    const endRecord = history[history.length - 1]
    
    // Average NAV over the period
    const avgNAV = history.reduce((sum, h) => sum + h.nav, 0) / history.length
    
    // Change in shares
    const shareChange = endRecord.sharesOutstanding - startRecord.sharesOutstanding
    
    // NNA = share change × average NAV
    return shareChange * avgNAV
  }

  return (
    <ETFDatabaseContext.Provider value={{
      etfProducts,
      deliveredReports,
      addETFProduct,
      updateETFProduct,
      addShareClass,
      updateShareClass,
      addHistoricalData,
      getETFProduct,
      getShareClass,
      getETFsForIssuer,
      getNAVHistory,
      addDeliveredReport,
      getReportsForIssuer,
      getLatestReport,
      getRollingAverageIdentified,
      calculateNNA
    }}>
      {children}
    </ETFDatabaseContext.Provider>
  )
}

export const useETFDatabase = () => {
  const context = useContext(ETFDatabaseContext)
  if (!context) {
    throw new Error('useETFDatabase must be used within an ETFDatabaseProvider')
  }
  return context
}

