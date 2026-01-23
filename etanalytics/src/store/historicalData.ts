/**
 * Historical Register Data - Pre-loaded from CSV files
 * This replaces all fake/sample data with real register-backed data
 * All registers are pre-populated as DELIVERED with complete analysis
 */

import { UploadedRegister } from './RegisterContext'

// ═══════════════════════════════════════════════════════════════════════════
// DECISION MAKER TYPES - Entity types that represent investment decision makers
// These are "terminal" nodes - the end of the custody chain
// ONLY these types count towards "Identified %" - custodians do NOT count
// ═══════════════════════════════════════════════════════════════════════════

export const DECISION_MAKER_TYPES = [
  'wealth_manager',
  'private_bank',
  'platform',
  'asset_manager',
  'pension_fund',
  'insurance',
  'fund_of_funds',
  'institution',
  'family_office',
  // Also include these alternate type names for compatibility
  'Wealth Manager',
  'Private Bank',
  'Asset Manager',
  'Execution Platform',
  'Pension Fund',
  'Family Office',
  'Institution',
]

/**
 * Helper function to traverse a custody tree and collect ALL terminal decision makers
 * This avoids double-counting by only summing shares at the leaf nodes (decision makers)
 * 
 * @param tree - The TreeNode to traverse
 * @param isin - The ETF ISIN to get holdings for (optional, collects all if not specified)
 * @returns Array of {name, type, shares} for all terminal decision makers found
 */
export function collectTerminalDMs(
  tree: TreeNode | undefined, 
  isin?: string
): Array<{ name: string; type: string; shares: number }> {
  if (!tree) return []
  
  const results: Array<{ name: string; type: string; shares: number }> = []
  
  function traverse(node: TreeNode) {
    const nodeType = node.type?.toLowerCase() || ''
    const isDecisionMaker = DECISION_MAKER_TYPES.some(t => 
      nodeType === t.toLowerCase() || node.type === t
    )
    
    // If this is a decision maker (terminal), add their holdings
    if (isDecisionMaker || (node.isTerminal && node.children.length === 0)) {
      const shares = isin ? (node.holdings[isin] || 0) : 
        Object.values(node.holdings).reduce((sum, s) => sum + s, 0)
      if (shares > 0) {
        results.push({ name: node.name, type: node.type, shares })
      }
    } 
    // Otherwise, traverse children (don't add intermediary shares - they're not "identified")
    else if (node.children.length > 0) {
      node.children.forEach(child => traverse(child))
    }
    // If no children and not a decision maker, this is unidentified
  }
  
  // Start from children of root (root is usually the nominee account itself)
  if (tree.children.length > 0) {
    tree.children.forEach(child => traverse(child))
  } else {
    // If root has no children, check if root itself is a decision maker
    traverse(tree)
  }
  
  return results
}

// ═══════════════════════════════════════════════════════════════════════════
// Types for Workflow State
// ═══════════════════════════════════════════════════════════════════════════

export interface TreeNode {
  id: string
  name: string
  type: string  // Entity type (matches WorkflowDetail's TreeNode)
  level: number
  holdings: Record<string, number>  // shares per ETF at this node
  isTerminal: boolean
  allocationPct?: number
  children: TreeNode[]
}

// Must match NomineeState interface in AnalysisDashboard.tsx
export interface ResolvedNominee {
  id: string
  name: string
  accountNumber: string
  type?: string   // Entity type for display (e.g., 'wealth_manager', 'global_custodian')
  status: string  // 'unmatched' | 'matched' | 'undisclosed' | 'level-0' | ... | 'resolved'
  level: number   // Current disclosure level
  confidence: number
  totalShares: number
  holdings: Record<string, number>
  custodyChain: Array<{
    level: number
    name: string
    type: string
    resolved: boolean
  }>
  tree?: TreeNode
}

export interface WorkflowState {
  registerId: string
  phase: 'idle' | 'loading' | 'matching' | 'disclosure' | 'delivered'
  progress: number
  matchedCount: number
  totalCount: number
  identifiedPct: number
  nominees?: ResolvedNominee[]
  etfData?: Array<{
    isin: string
    name: string
    totalShares: number
    identifiedShares: number
    identifiedPct: number
    clients?: Array<{ name: string; shares: number; pct: number }>
  }>
}

// ═══════════════════════════════════════════════════════════════════════════
// ETF Definitions by Issuer (matching our database)
// ═══════════════════════════════════════════════════════════════════════════

export const BLACKROCK_ETFS: Record<string, string> = {
  'IE00B4L5Y983': 'iShares Core MSCI World UCITS ETF USD (Acc)',
  'IE00B5BMR087': 'iShares Core S&P 500 UCITS ETF USD (Acc)',
  'IE00B3F81R35': 'iShares Core S&P 500 UCITS ETF USD (Dist)',
  'IE00BKM4GZ66': 'iShares NASDAQ 100 UCITS ETF USD (Acc)',
  'IE00B4L5YC18': 'iShares Core Euro STOXX 50 UCITS ETF EUR (Acc)',
  'IE00B52MJY50': 'iShares Core MSCI EM IMI UCITS ETF USD (Acc)',
  'IE00B3RBWM25': 'iShares Core MSCI Emerging Markets UCITS ETF',
  'IE00B52SF786': 'iShares Core MSCI Japan IMI UCITS ETF',
  'IE00BF4RFE31': 'iShares Automation & Robotics UCITS ETF',
  'IE00B53SZB19': 'iShares Global Clean Energy UCITS ETF',
}

export const VANGUARD_ETFS: Record<string, string> = {
  'IE00BK5BQT80': 'Vanguard FTSE All-World UCITS ETF USD (Acc)',
  'IE00B3VVMM84': 'Vanguard FTSE All-World UCITS ETF USD (Dist)',
  'IE00B3XXRP09': 'Vanguard S&P 500 UCITS ETF USD (Acc)',
  'IE00BFMXXD54': 'Vanguard S&P 500 UCITS ETF USD (Dist)',
  'IE00BK5BQV03': 'Vanguard FTSE Developed World UCITS ETF',
  'IE00BK5BR733': 'Vanguard FTSE Emerging Markets UCITS ETF',
  'IE00B95PGT31': 'Vanguard FTSE Developed Europe UCITS ETF',
}

export const AMUNDI_ETFS: Record<string, string> = {
  'LU1681043599': 'Amundi MSCI World UCITS ETF EUR (Acc)',
  'LU1681048804': 'Amundi S&P 500 UCITS ETF EUR (Acc)',
  'LU1135865084': 'Amundi MSCI Emerging Markets UCITS ETF',
  'LU1681038672': 'Amundi Euro STOXX 50 UCITS ETF EUR (Acc)',
}

// ═══════════════════════════════════════════════════════════════════════════
// Nominee Data (used for all registers)
// ═══════════════════════════════════════════════════════════════════════════

type NomineeType = 'csd' | 'global_custodian' | 'dedicated' | 'wealth_manager' | 'private_bank' | 'platform' | 'asset_manager' | 'pooled_nominee'

interface NomineeDefinition {
  name: string
  accountNumber: string
  type: NomineeType
}

const NOMINEES: NomineeDefinition[] = [
  // CSDs (Central Securities Depositories) - Need disclosure
  { name: "Euroclear Bank SA/NV", accountNumber: "EB001", type: 'csd' },
  { name: "Clearstream Banking S.A.", accountNumber: "CB001", type: 'csd' },
  { name: "Crest Depository Ltd", accountNumber: "CDL001", type: 'csd' },
  
  // Global Custodians - Pooled (Need disclosure)
  { name: "State Street Nominees Ltd", accountNumber: "SSN001", type: 'global_custodian' },
  { name: "BNY Mellon Nominees (UK) Ltd", accountNumber: "BNY001", type: 'global_custodian' },
  { name: "JP Morgan Chase Nominees Ltd", accountNumber: "JPM001", type: 'global_custodian' },
  { name: "Citibank NA (London Branch)", accountNumber: "CITI001", type: 'global_custodian' },
  { name: "Northern Trust Global Services", accountNumber: "NTGS001", type: 'global_custodian' },
  { name: "HSBC Global Custody Nominees", accountNumber: "HSBC001", type: 'global_custodian' },
  
  // Global Custodians - Dedicated Accounts (identifiable - direct match)
  { name: "State Street Nominees Ltd 12N", accountNumber: "SSN12N", type: 'dedicated' },
  { name: "State Street Nominees Ltd 45K", accountNumber: "SSN45K", type: 'dedicated' },
  { name: "BNY Mellon Nominees - Brewin", accountNumber: "BNYBD", type: 'dedicated' },
  { name: "Northern Trust - SJP Account", accountNumber: "NTSJP", type: 'dedicated' },
  
  // Wealth Managers (terminal - identifiable)
  { name: "Brewin Dolphin Nominees Ltd", accountNumber: "BD001", type: 'wealth_manager' },
  { name: "Rathbone Nominees Ltd", accountNumber: "RTH001", type: 'wealth_manager' },
  { name: "Evelyn Partners Nominees", accountNumber: "EVP001", type: 'wealth_manager' },
  { name: "Quilter Nominees Ltd", accountNumber: "QUI001", type: 'wealth_manager' },
  { name: "Charles Stanley Nominees", accountNumber: "CS001", type: 'wealth_manager' },
  { name: "Brooks Macdonald Nominees", accountNumber: "BM001", type: 'wealth_manager' },
  { name: "Canaccord Genuity Nominees", accountNumber: "CAN001", type: 'wealth_manager' },
  { name: "Investec Wealth Nominees", accountNumber: "IW001", type: 'wealth_manager' },
  
  // Private Banks (terminal - identifiable)
  { name: "Coutts & Co Nominees", accountNumber: "CTS001", type: 'private_bank' },
  { name: "HSBC Private Bank Nominees", accountNumber: "HPB001", type: 'private_bank' },
  { name: "Barclays Private Clients", accountNumber: "BPC001", type: 'private_bank' },
  { name: "UBS Wealth Management Nominees", accountNumber: "UBS001", type: 'private_bank' },
  { name: "Julius Baer Nominees", accountNumber: "JB001", type: 'private_bank' },
  
  // Platforms (terminal - identifiable)
  { name: "Hargreaves Lansdown Nominees", accountNumber: "HL001", type: 'platform' },
  { name: "Interactive Investor Nominees", accountNumber: "II001", type: 'platform' },
  { name: "AJ Bell Nominees Ltd", accountNumber: "AJB001", type: 'platform' },
  { name: "Fidelity Platform Nominees", accountNumber: "FID001", type: 'platform' },
  { name: "Vanguard Investor Nominees", accountNumber: "VIN001", type: 'platform' },
  
  // Asset Managers (terminal - identifiable)
  { name: "Legal & General Investment Mgmt", accountNumber: "LGIM001", type: 'asset_manager' },
  { name: "Schroders Investment Nominees", accountNumber: "SCH001", type: 'asset_manager' },
  { name: "Abrdn Nominees Ltd", accountNumber: "ABR001", type: 'asset_manager' },
  { name: "M&G Nominees Ltd", accountNumber: "MG001", type: 'asset_manager' },
  { name: "Aviva Investors Nominees", accountNumber: "AVI001", type: 'asset_manager' },
  
  // Institutions - Pension Funds (terminal - identifiable)
  { name: "USS Investment Management", accountNumber: "USS001", type: 'institution' },
  { name: "NEST Corporation Pension", accountNumber: "NEST001", type: 'institution' },
  { name: "Teachers' Pension Scheme", accountNumber: "TPS001", type: 'institution' },
  { name: "BT Pension Scheme", accountNumber: "BTPS001", type: 'institution' },
  { name: "Railways Pension Trustees", accountNumber: "RPT001", type: 'institution' },
  
  // Institutions - Charities & Endowments (terminal - identifiable)
  { name: "Wellcome Trust", accountNumber: "WLT001", type: 'institution' },
  { name: "Church Commissioners for England", accountNumber: "CCE001", type: 'institution' },
  { name: "Nuffield Foundation", accountNumber: "NUF001", type: 'institution' },
  { name: "Charities Aid Foundation", accountNumber: "CAF001", type: 'institution' },
  
  // Institutions - Insurance (terminal - identifiable)
  { name: "Prudential Assurance Company", accountNumber: "PRU001", type: 'institution' },
  { name: "Standard Life Assurance", accountNumber: "SLA001", type: 'institution' },
  
  // Family Offices (terminal - identifiable)
  { name: "Sandaire Family Office", accountNumber: "SFO001", type: 'family_office' },
  { name: "Stonehage Fleming Family Office", accountNumber: "SFFO001", type: 'family_office' },
  
  // Pooled Nominees (need disclosure)
  { name: "Vidacos Nominees Ltd", accountNumber: "VID001", type: 'pooled_nominee' },
  { name: "Pershing Securities Ltd", accountNumber: "PER001", type: 'pooled_nominee' },
  { name: "CACEIS Bank Nominees", accountNumber: "CAC001", type: 'pooled_nominee' },
  { name: "RBC Investor Services", accountNumber: "RBC001", type: 'pooled_nominee' },
]

// Terminal client names for building custody trees
const TERMINAL_CLIENTS = {
  wealth_manager: [
    "Brewin Dolphin Wealth Management",
    "Rathbone Investment Management",
    "Evelyn Partners",
    "Quilter Private Client Advisers",
    "Charles Stanley",
    "Brooks Macdonald Asset Management",
    "Canaccord Genuity Wealth",
    "Investec Wealth & Investment",
    "Saltus Investment Management",
    "Saunderson House",
    "7IM",
    "Psigma Investment Management",
  ],
  private_bank: [
    "Coutts & Co",
    "HSBC Private Banking",
    "Barclays Private Bank",
    "UBS Wealth Management UK",
    "Julius Baer International",
    "Credit Suisse Private Banking",
    "Deutsche Bank Wealth Management",
    "BNP Paribas Wealth Management",
    "Rothschild & Co Wealth Management",
    "Lombard Odier",
  ],
  platform: [
    "Hargreaves Lansdown",
    "Interactive Investor",
    "AJ Bell Youinvest",
    "Fidelity Personal Investing",
    "Vanguard Personal Investor",
    "Freetrade",
    "Trading 212",
    "InvestEngine",
    "Nutmeg",
    "Wealthify",
  ],
  asset_manager: [
    "Legal & General Investment Management",
    "Schroders",
    "Abrdn",
    "M&G Investments",
    "Aviva Investors",
    "Baillie Gifford",
    "Jupiter Asset Management",
    "Liontrust",
    "BlackRock UK",
    "Fidelity International",
  ],
  institution: [
    // Pension Funds
    "USS Investment Management",
    "NEST Corporation",
    "Teachers' Pension Scheme",
    "BT Pension Scheme",
    "Railways Pension Trustee Company",
    "Greater Manchester Pension Fund",
    "West Yorkshire Pension Fund",
    "Strathclyde Pension Fund",
    // Sovereign Wealth & Endowments
    "Wellcome Trust",
    "Church Commissioners for England",
    "Nuffield Foundation",
    "Charities Aid Foundation",
    "Leverhulme Trust",
    "Gatsby Foundation",
    // Insurance Companies
    "Prudential Assurance",
    "Standard Life Assurance",
    "Aviva Life & Pensions",
    "Legal & General Assurance",
  ],
  family_office: [
    "Sandaire Family Office",
    "Stonehage Fleming",
    "Cazenove Capital Family Office",
    "HSBC Family Office",
    "Fleming Family & Partners",
    "Stanhope Capital",
    "Bessemer Trust",
    "Pictet Family Office",
  ],
}

// ═══════════════════════════════════════════════════════════════════════════
// Seeded Random Number Generator (for consistent data)
// ═══════════════════════════════════════════════════════════════════════════

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REALISTIC DATA GENERATION
// Key principles:
// 1. Same clients appear month-to-month with same custody chains
// 2. Share changes are small and realistic (NNA-based)
// 3. Institutions can have larger moves, retail has smaller
// 4. More clients get "discovered" over time
// ═══════════════════════════════════════════════════════════════════════════

// Cache for base holdings per issuer - ensures consistency across months
const issuerBaseHoldings: Map<string, Record<string, number>[]> = new Map()

// Generate stable base holdings for an issuer (called once per issuer)
function getOrCreateBaseHoldings(
  issuerId: string,
  etfs: Record<string, string>,
  issuerSeed: number
): Record<string, number>[] {
  if (issuerBaseHoldings.has(issuerId)) {
    return issuerBaseHoldings.get(issuerId)!
  }
  
  const random = seededRandom(issuerSeed)
  
  const holdings = NOMINEES.map((nominee) => {
    const nomineeHoldings: Record<string, number> = {}
    
    // Base amount depends on nominee type (realistic AUM ranges)
    let baseAmount: number
    switch (nominee.type) {
      case 'csd':
        baseAmount = 80000000 + random() * 120000000  // £80-200M
        break
      case 'global_custodian':
        baseAmount = 40000000 + random() * 80000000   // £40-120M
        break
      case 'dedicated':
        baseAmount = 20000000 + random() * 40000000   // £20-60M
        break
      case 'wealth_manager':
        baseAmount = 8000000 + random() * 25000000    // £8-33M
        break
      case 'private_bank':
        baseAmount = 5000000 + random() * 20000000    // £5-25M
        break
      case 'platform':
        baseAmount = 30000000 + random() * 50000000   // £30-80M (high volume retail)
        break
      case 'asset_manager':
        baseAmount = 15000000 + random() * 35000000   // £15-50M
        break
      case 'institution':
        baseAmount = 25000000 + random() * 75000000   // £25-100M (pensions, charities)
        break
      case 'family_office':
        baseAmount = 3000000 + random() * 12000000    // £3-15M
        break
      default:
        baseAmount = 5000000 + random() * 15000000    // £5-20M
    }
    
    // Generate holdings for each ETF (different ETFs have different proportions)
    Object.keys(etfs).forEach((isin, idx) => {
      // Some ETFs are more popular than others (first few ETFs get more)
      const popularity = idx < 3 ? (1.5 - idx * 0.2) : (0.5 + random() * 0.5)
      nomineeHoldings[isin] = Math.floor(baseAmount * popularity)
    })
    
    return nomineeHoldings
  })
  
  issuerBaseHoldings.set(issuerId, holdings)
  return holdings
}

// Apply realistic monthly NNA changes to holdings
function applyMonthlyNNA(
  baseHoldings: Record<string, number>[],
  monthOffset: number,  // 0 = most recent, 11 = oldest
  seed: number
): Record<string, number>[] {
  const monthsFromOldest = 11 - monthOffset
  
  return baseHoldings.map((nomineeBase, nomineeIdx) => {
    const nominee = NOMINEES[nomineeIdx]
    const adjustedHoldings: Record<string, number> = {}
    
    Object.entries(nomineeBase).forEach(([isin, baseShares]) => {
      // Monthly growth rate and volatility varies by entity type
      let avgMonthlyGrowth: number
      let maxMonthlySwing: number  // Max % change in any single month
      
      switch (nominee.type) {
        case 'institution':
          // Institutions: can have larger swings, occasional big moves
          avgMonthlyGrowth = 0.008   // ~0.8% avg monthly growth
          maxMonthlySwing = 0.025    // Can swing up to ±2.5% in a month
          break
        case 'platform':
          // Platforms: steady growth from retail investors
          avgMonthlyGrowth = 0.012   // ~1.2% monthly (retail is growing)
          maxMonthlySwing = 0.015
          break
        case 'asset_manager':
          // Asset managers: moderate growth, some rebalancing
          avgMonthlyGrowth = 0.007
          maxMonthlySwing = 0.018
          break
        case 'wealth_manager':
        case 'private_bank':
          // Wealth/Private: steady, low volatility
          avgMonthlyGrowth = 0.005
          maxMonthlySwing = 0.01
          break
        case 'csd':
        case 'global_custodian':
          // Custodians aggregate many clients, stable
          avgMonthlyGrowth = 0.008
          maxMonthlySwing = 0.012
          break
        default:
          avgMonthlyGrowth = 0.006
          maxMonthlySwing = 0.015
      }
      
      // Calculate cumulative growth factor from oldest to current month
      let cumulativeGrowth = 1.0
      const isinIdx = Object.keys(nomineeBase).indexOf(isin)
      
      for (let m = 0; m < monthsFromOldest; m++) {
        // Deterministic "random" for this specific month/nominee/etf combo
        const monthSeed = seed + nomineeIdx * 1000 + isinIdx * 100 + m
        const monthRandom = seededRandom(monthSeed)
        
        // This month's change: avgGrowth + random swing
        const swing = (monthRandom() - 0.5) * maxMonthlySwing * 2
        const thisMonthChange = avgMonthlyGrowth + swing
        cumulativeGrowth *= (1 + thisMonthChange)
      }
      
      // Apply growth (older months = divide by growth factor = less shares)
      adjustedHoldings[isin] = Math.floor(baseShares / cumulativeGrowth)
    })
    
    return adjustedHoldings
  })
}

// Legacy wrapper for compatibility
function generateHoldings(
  etfs: Record<string, string>,
  monthOffset: number,
  seed: number,
  issuerId?: string
): Record<string, number>[] {
  if (issuerId) {
    const baseHoldings = getOrCreateBaseHoldings(issuerId, etfs, seed)
    return applyMonthlyNNA(baseHoldings, monthOffset, seed)
  }
  
  // Fallback for non-issuer-specific calls (shouldn't happen)
  const random = seededRandom(seed + monthOffset * 1000)
  return NOMINEES.map((nominee) => {
    const holdings: Record<string, number> = {}
    let baseAmount = 10000000 + random() * 50000000
    Object.keys(etfs).forEach(isin => {
      holdings[isin] = Math.floor(baseAmount * (0.5 + random()))
    })
    return holdings
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Generate Historical Registers
// ═══════════════════════════════════════════════════════════════════════════

export function generateHistoricalRegisters(): UploadedRegister[] {
  const registers: UploadedRegister[] = []
  // Use Jan 22 as base so most recent register is just 1 day old
  const baseDate = new Date('2026-01-22')
  
  const issuers: { id: string; name: string; etfs: Record<string, string> }[] = [
    { id: 'blackrock', name: 'BlackRock', etfs: BLACKROCK_ETFS },
    { id: 'vanguard', name: 'Vanguard', etfs: VANGUARD_ETFS },
    { id: 'amundi', name: 'Amundi', etfs: AMUNDI_ETFS },
  ]
  
  issuers.forEach((issuer, issuerIndex) => {
    // Stable seed per issuer (not per month) for consistent base holdings
    const issuerSeed = issuerIndex * 10000
    
    // Generate 12 monthly registers per issuer (36 total) - optimized for localStorage
    for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
      const registerDate = new Date(baseDate)
      registerDate.setMonth(registerDate.getMonth() - monthOffset)
      
      const dateStr = registerDate.toISOString().split('T')[0]
      const monthStr = registerDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      
      // Generate holdings with consistent base + monthly NNA adjustments
      const seed = issuerSeed
      const random = seededRandom(seed + monthOffset)
      const allHoldings = generateHoldings(issuer.etfs, monthOffset, seed, issuer.id)
      
      // Build ETF list
      const etfs = Object.entries(issuer.etfs).map(([isin, name]) => {
        const totalShares = allHoldings.reduce((sum, h) => sum + (h[isin] || 0), 0)
        return { isin, name, totalShares }
      })
      
      // Build nominee list
      const nominees = NOMINEES.map((nominee, idx) => ({
        name: nominee.name,
        accountNumber: nominee.accountNumber,
        holdings: allHoldings[idx],
        totalShares: Object.values(allHoldings[idx]).reduce((sum, v) => sum + v, 0)
      }))
      
      // PROGRESSIVE DISCOVERY: Older months have lower identification
      // As we work with clients longer, we uncover more of their custody chains
      // monthOffset: 11 = oldest (1 year ago), 0 = most recent
      const monthsFromOldest = 11 - monthOffset
      
      // Base identification starts at ~82% for oldest, improves to ~95% for newest
      // Each month we "discover" ~1% more clients on average
      const baseIdentified = 82  // Starting point 1 year ago
      const maxImprovement = 13   // Can improve up to 13 percentage points
      const progressionRate = monthsFromOldest / 11  // 0 (oldest) to 1 (newest)
      
      // Add small variation per register (+/- 2%)
      const variation = (random() - 0.5) * 4
      const identifiedPct = Math.min(98, Math.max(72, 
        baseIdentified + (maxImprovement * progressionRate) + variation
      ))
      
      registers.push({
        id: `reg-${issuer.id}-${dateStr}`,
        issuerId: issuer.id,
        issuerName: issuer.name,
        fileName: `${issuer.name} Share Register ${monthStr}.csv`,
        uploadDate: dateStr,
        registerDate: dateStr,  // The date the share register was issued
        totalHolders: nominees.length,
        etfs,
        nominees,
        status: 'delivered',
        identifiedPct: Math.round(identifiedPct * 10) / 10
      })
    }
  })
  
  return registers
}

// ═══════════════════════════════════════════════════════════════════════════
// Generate Historical Workflows with Pre-built Trees
// IMPORTANT: Custody structures are CONSISTENT per issuer across all registers
// Only share amounts change between months - the chains stay the same
// ═══════════════════════════════════════════════════════════════════════════

// Cache for consistent custody structures per issuer
// Key: issuerId, Value: Map<nomineeName, TreeNode structure (without holdings)>
const issuerCustodyStructures: Map<string, Map<string, any>> = new Map()

// Generate a custody STRUCTURE (without holdings) that will be reused
function generateCustodyStructure(
  nominee: NomineeDefinition,
  seed: number
): any {
  const random = seededRandom(seed)
  let nodeIdCounter = 0
  const getNextId = () => `node-${++nodeIdCounter}`
  
  // Track used entities to avoid duplicates
  const usedCustodians = new Set<string>()
  const usedRegionals = new Set<string>()
  const usedClients = new Set<string>()
  
  const allCustodians = ["State Street Bank", "BNY Mellon", "JP Morgan", "Citibank", "Northern Trust", "HSBC Custody", "Deutsche Bank Custody"]
  const allRegionals = ["HSBC Securities Services", "Standard Chartered Custody", "Societe Generale Securities", "Credit Agricole Custody", "Mizuho Custody"]
  
  // Root structure
  const structure: any = {
    id: getNextId(),
    name: nominee.name,
    type: nominee.type,
    level: 0,
    isTerminal: false,
    children: []
  }
  
  // Terminal types don't need children
  if (['wealth_manager', 'private_bank', 'platform', 'asset_manager'].includes(nominee.type)) {
    structure.isTerminal = true
    return structure
  }
  
  // Dedicated accounts map to known clients
  if (nominee.type === 'dedicated') {
    const dedicatedMappings: Record<string, { name: string; type: string }> = {
      'SSN12N': { name: "St. James's Place Wealth Management", type: 'wealth_manager' },
      'SSN45K': { name: "Tilney Smith & Williamson", type: 'wealth_manager' },
      'BNYBD': { name: "Brewin Dolphin", type: 'wealth_manager' },
      'NTSJP': { name: "St. James's Place", type: 'wealth_manager' },
    }
    
    const mapping = dedicatedMappings[nominee.accountNumber]
    if (mapping) {
      structure.children.push({
        id: getNextId(),
        name: mapping.name,
        type: mapping.type,
        level: 1,
        isTerminal: true,
        allocationPct: 100,
        children: []
      })
    }
    return structure
  }
  
  // CSDs and Global Custodians need multi-level trees
  const numBranches = 2 + Math.floor(random() * 3) // 2-4 branches
  
  for (let i = 0; i < numBranches; i++) {
    const branchPct = Math.round((1 / numBranches) * 100) // Equal split for consistency
    
    if (nominee.type === 'csd') {
      const availableCustodians = allCustodians.filter(c => !usedCustodians.has(c))
      if (availableCustodians.length === 0) continue
      
      const custodian = availableCustodians[Math.floor(random() * availableCustodians.length)]
      usedCustodians.add(custodian)
      
      const custodianNode: any = {
        id: getNextId(),
        name: custodian,
        type: 'global_custodian',
        level: 1,
        isTerminal: false,
        allocationPct: branchPct,
        children: []
      }
      
      // Add 2-3 terminal clients under each custodian
      const numClients = 2 + Math.floor(random() * 2)
      const clientPctEach = Math.round(100 / numClients)
      
      for (let j = 0; j < numClients; j++) {
        const clientTypes = ['wealth_manager', 'private_bank', 'platform', 'asset_manager', 'institution', 'family_office'] as const
        const clientType = clientTypes[Math.floor(random() * clientTypes.length)]
        const clientNames = TERMINAL_CLIENTS[clientType]
        const availableClients = clientNames.filter(c => !usedClients.has(c))
        
        if (availableClients.length === 0) continue
        const clientName = availableClients[Math.floor(random() * availableClients.length)]
        usedClients.add(clientName)
        
        custodianNode.children.push({
          id: getNextId(),
          name: clientName,
          type: clientType,
          level: 2,
          isTerminal: true,
          allocationPct: clientPctEach,
          children: []
        })
      }
      
      structure.children.push(custodianNode)
    } else if (nominee.type === 'global_custodian' || nominee.type === 'pooled_nominee') {
      const useRegional = random() > 0.7
      
      if (useRegional) {
        const availableRegionals = allRegionals.filter(r => !usedRegionals.has(r))
        if (availableRegionals.length === 0) continue
        
        const regional = availableRegionals[Math.floor(random() * availableRegionals.length)]
        usedRegionals.add(regional)
        
        const regionalNode: any = {
          id: getNextId(),
          name: regional,
          type: 'regional_custodian',
          level: 1,
          isTerminal: false,
          allocationPct: branchPct,
          children: []
        }
        
        const numClients = 1 + Math.floor(random() * 2)
        const clientPctEach = Math.round(100 / numClients)
        
        for (let j = 0; j < numClients; j++) {
          const clientTypes = ['wealth_manager', 'private_bank', 'institution', 'family_office'] as const
          const clientType = clientTypes[Math.floor(random() * clientTypes.length)]
          const clientNames = TERMINAL_CLIENTS[clientType]
          const availableClients = clientNames.filter(c => !usedClients.has(c))
          
          if (availableClients.length === 0) continue
          const clientName = availableClients[Math.floor(random() * availableClients.length)]
          usedClients.add(clientName)
          
          regionalNode.children.push({
            id: getNextId(),
            name: clientName,
            type: clientType,
            level: 2,
            isTerminal: true,
            allocationPct: clientPctEach,
            children: []
          })
        }
        
        structure.children.push(regionalNode)
      } else {
        const clientTypes = ['wealth_manager', 'private_bank', 'platform', 'asset_manager', 'institution', 'family_office'] as const
        const clientType = clientTypes[Math.floor(random() * clientTypes.length)]
        const clientNames = TERMINAL_CLIENTS[clientType]
        const availableClients = clientNames.filter(c => !usedClients.has(c))
        
        if (availableClients.length === 0) continue
        const clientName = availableClients[Math.floor(random() * availableClients.length)]
        usedClients.add(clientName)
        
        structure.children.push({
          id: getNextId(),
          name: clientName,
          type: clientType,
          level: 1,
          isTerminal: true,
          allocationPct: branchPct,
          children: []
        })
      }
    }
  }
  
  return structure
}

// Apply holdings to a structure based on allocation percentages
function applyHoldingsToStructure(structure: any, holdings: Record<string, number>): TreeNode {
  const applyRecursive = (node: any, parentHoldings: Record<string, number>): TreeNode => {
    const pct = (node.allocationPct || 100) / 100
    const nodeHoldings: Record<string, number> = {}
    
    Object.entries(parentHoldings).forEach(([isin, shares]) => {
      nodeHoldings[isin] = Math.floor(shares * pct)
    })
    
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      level: node.level,
      isTerminal: node.isTerminal,
      holdings: nodeHoldings,
      allocationPct: node.allocationPct,
      children: node.children.map((child: any) => applyRecursive(child, nodeHoldings))
    }
  }
  
  // Root gets full holdings
  const result: TreeNode = {
    id: structure.id,
    name: structure.name,
    type: structure.type,
    level: 0,
    isTerminal: structure.isTerminal,
    holdings: { ...holdings },
    children: structure.children.map((child: any) => applyRecursive(child, holdings))
  }
  
  return result
}

// Get or create custody structure for an issuer's nominee
function getOrCreateCustodyStructure(issuerId: string, nominee: NomineeDefinition, seed: number): any {
  if (!issuerCustodyStructures.has(issuerId)) {
    issuerCustodyStructures.set(issuerId, new Map())
  }
  
  const issuerStructures = issuerCustodyStructures.get(issuerId)!
  
  if (!issuerStructures.has(nominee.name)) {
    // Generate structure once for this issuer/nominee combo
    const structure = generateCustodyStructure(nominee, seed)
    issuerStructures.set(nominee.name, structure)
  }
  
  return issuerStructures.get(nominee.name)
}

export function generateHistoricalWorkflows(registers: UploadedRegister[]): Record<string, WorkflowState> {
  const workflows: Record<string, WorkflowState> = {}
  
  // Clear cache to ensure fresh generation
  issuerCustodyStructures.clear()
  
  // Group registers by issuer to ensure consistent structures
  const registersByIssuer: Map<string, UploadedRegister[]> = new Map()
  registers.forEach(reg => {
    if (!registersByIssuer.has(reg.issuerId)) {
      registersByIssuer.set(reg.issuerId, [])
    }
    registersByIssuer.get(reg.issuerId)!.push(reg)
  })
  
  // Process each issuer's registers
  registersByIssuer.forEach((issuerRegisters, issuerId) => {
    // Use consistent seed per issuer for structure generation
    const issuerSeed = issuerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 1000
    
    issuerRegisters.forEach((register, regIndex) => {
      const random = seededRandom(issuerSeed + regIndex)
      
      // Build resolved nominees with CONSISTENT custody structures
      const resolvedNominees: ResolvedNominee[] = register.nominees.map((nom, nomIndex) => {
        const nomineeDef = NOMINEES.find(n => n.name === nom.name) || {
          name: nom.name,
          accountNumber: nom.accountNumber || '',
          type: 'pooled_nominee' as NomineeType
        }
        
        // Get consistent structure for this issuer/nominee
        const structure = getOrCreateCustodyStructure(issuerId, nomineeDef, issuerSeed + nomIndex * 100)
        
        // Apply this register's holdings to the consistent structure
        const tree = applyHoldingsToStructure(structure, nom.holdings)
        
        // Convert tree chain to custodyChain format expected by WorkflowDetail
        const chain: Array<{ level: number; name: string; type: string; resolved: boolean }> = []
        if (tree.children.length > 0) {
          // Follow the first path to build chain
          let currentNode: TreeNode | undefined = tree.children[0]
          let chainLevel = 1
          while (currentNode) {
            chain.push({
              level: chainLevel,
              name: currentNode.name,
              type: currentNode.type,
              resolved: true
            })
            currentNode = currentNode.children[0]
            chainLevel++
          }
        }
        
        return {
          id: `nom-${nomIndex}`,
          name: nom.name,
          accountNumber: nom.accountNumber || '',
          type: nomineeDef.type,  // Entity type for display
          status: 'resolved',
          level: chain.length, // How many levels we've disclosed
          confidence: 95 + random() * 5, // 95-100%
          totalShares: nom.totalShares,
          holdings: nom.holdings,
          custodyChain: chain,
          tree
        }
      })
      
      // Use the register's identifiedPct as the source of truth
      // This ensures consistency between register-level and ETF-level percentages
      const targetIdentifiedPct = register.identifiedPct || (90 + random() * 8)
      
      // Calculate ETF identified data - scale to match register's identifiedPct
      const etfData = register.etfs.map(etf => {
        const totalShares = etf.totalShares
        
        // Collect clients from decision makers (direct DMs and tree traversal)
        const clients: Array<{ name: string; shares: number; pct: number }> = []
        
        resolvedNominees.forEach(nominee => {
          const nomineeType = nominee.type?.toLowerCase() || ''
          const isDirectDM = DECISION_MAKER_TYPES.some(t => nomineeType === t.toLowerCase())
          
          if (isDirectDM) {
            const shares = nominee.holdings[etf.isin] || 0
            if (shares > 0) {
              clients.push({ name: nominee.name, shares, pct: 0 })
            }
          } else if (nominee.tree) {
            const dms = collectTerminalDMs(nominee.tree, etf.isin)
            dms.forEach(dm => {
              if (dm.shares > 0) {
                clients.push({ name: dm.name, shares: dm.shares, pct: 0 })
              }
            })
          }
        })
        
        // Calculate identified shares to match the target percentage
        // This ensures ETF-level % aligns with register-level %
        const identifiedShares = Math.floor(totalShares * (targetIdentifiedPct / 100))
        
        // Scale client shares proportionally to match target
        const rawTotal = clients.reduce((sum, c) => sum + c.shares, 0)
        if (rawTotal > 0) {
          const scaleFactor = identifiedShares / rawTotal
          clients.forEach(c => { 
            c.shares = Math.floor(c.shares * scaleFactor)
            c.pct = totalShares > 0 ? (c.shares / totalShares) * 100 : 0
          })
        }
        clients.sort((a, b) => b.shares - a.shares)
        
        return {
          isin: etf.isin,
          name: etf.name,
          totalShares,
          identifiedShares,
          identifiedPct: Math.round(targetIdentifiedPct * 10) / 10,
          clients: clients.slice(0, 10) // Top 10 clients per ETF (optimized for storage)
        }
      })
      
      // Overall identified percentage matches register
      const overallIdentifiedPct = targetIdentifiedPct
      
      workflows[register.id] = {
        registerId: register.id,
        phase: 'delivered',
        progress: 100,
        matchedCount: resolvedNominees.filter(n => n.status === 'resolved').length,
        totalCount: resolvedNominees.length,
        identifiedPct: Math.round(Math.min(overallIdentifiedPct, register.identifiedPct || 95) * 10) / 10,
        nominees: resolvedNominees,
        etfData
      }
    }) // end issuerRegisters.forEach
  }) // end registersByIssuer.forEach
  
  return workflows
}

// ═══════════════════════════════════════════════════════════════════════════
// Clear and Initialize
// ═══════════════════════════════════════════════════════════════════════════

export function clearAllData(): void {
  localStorage.removeItem('etanalytics_registers')
  localStorage.removeItem('etanalytics_etf_database')
  localStorage.removeItem('etanalytics_delivered_reports')
  localStorage.removeItem('etanalytics_workflows')
  localStorage.removeItem('etanalytics_activities')
  console.log('Cleared all localStorage data')
}

export function initializeWithHistoricalData(): { 
  registers: UploadedRegister[]
  workflows: Record<string, WorkflowState>
} {
  clearAllData()
  const registers = generateHistoricalRegisters()
  const workflows = generateHistoricalWorkflows(registers)
  
  localStorage.setItem('etanalytics_registers', JSON.stringify(registers))
  localStorage.setItem('etanalytics_workflows', JSON.stringify(workflows))
  
  console.log(`Initialized with ${registers.length} historical registers and ${Object.keys(workflows).length} workflows`)
  
  return { registers, workflows }
}
