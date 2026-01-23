/**
 * Entity Type Constants
 * Shared definitions for entity classification across the application
 * 
 * IMPORTANT: These must match the backend server.py KNOWN_ENTITIES definitions
 */

import { EntityType } from '../types'

/**
 * Entity types that represent investment decision makers
 * These are "terminal" nodes in the custody chain - no further drilling needed
 * 
 * Backend equivalent: entities with "requires_disclosure": False and "confidence": 100
 */
export const TERMINAL_ENTITY_TYPES: EntityType[] = [
  'wealth_manager',
  'platform',
  'private_bank',
  'asset_manager',
  'pension_fund',
  'insurance',
  'fund_of_funds',
]

/**
 * Entity types that are intermediaries requiring disclosure
 * These need to be drilled through to find the ultimate decision maker
 * 
 * Backend equivalent: entities with "requires_disclosure": True
 */
export const INTERMEDIARY_ENTITY_TYPES: EntityType[] = [
  'csd',
  'global_custodian',
  'local_custodian',
  'dedicated_nominee',
  'pooled_nominee',
  'market_maker',
]

/**
 * Check if an entity type is a terminal (investment decision maker)
 */
export const isTerminalEntityType = (type: string): boolean => {
  return TERMINAL_ENTITY_TYPES.includes(type as EntityType)
}

/**
 * Check if an entity type requires disclosure
 */
export const requiresDisclosure = (type: string): boolean => {
  return INTERMEDIARY_ENTITY_TYPES.includes(type as EntityType) || type === 'unknown'
}

/**
 * Display labels for entity types
 */
export const ENTITY_TYPE_LABELS: Record<EntityType | string, string> = {
  // Intermediaries
  'csd': 'CSD (Central Securities Depository)',
  'global_custodian': 'Global Custodian',
  'local_custodian': 'Local/Regional Custodian',
  'dedicated_nominee': 'Dedicated Nominee',
  'pooled_nominee': 'Pooled Nominee',
  'market_maker': 'Market Maker',
  
  // Decision Makers
  'wealth_manager': 'Wealth Manager',
  'platform': 'Execution Platform',
  'private_bank': 'Private Bank',
  'asset_manager': 'Asset Manager',
  'pension_fund': 'Pension Fund',
  'insurance': 'Insurance Company',
  'fund_of_funds': 'Fund of Funds',
  
  // Unknown
  'unknown': 'Unknown',
  
  // Alternative display labels (for backwards compatibility)
  'Wealth Manager': 'Wealth Manager',
  'Execution Platform': 'Execution Platform',
  'Private Bank': 'Private Bank',
  'Asset Manager': 'Asset Manager',
  'Pension Fund': 'Pension Fund',
  'Family Office': 'Family Office',
  'Institution': 'Institutional Investor',
  'CSD (Level 1)': 'CSD (Central Securities Depository)',
  'Global Custodian': 'Global Custodian',
  'Regional Custodian': 'Regional Custodian',
  'Clearing Broker': 'Clearing Broker',
}

/**
 * Entity type colors for UI display
 */
export const ENTITY_TYPE_COLORS: Record<EntityType | string, string> = {
  // Intermediaries (orange/yellow - need attention)
  'csd': '#f59e0b',
  'global_custodian': '#f97316',
  'local_custodian': '#fb923c',
  'dedicated_nominee': '#84cc16',
  'pooled_nominee': '#eab308',
  'market_maker': '#a3a3a3',
  
  // Decision Makers (green/teal - identified)
  'wealth_manager': '#00d4aa',
  'platform': '#22d3ee',
  'private_bank': '#0ea5e9',
  'asset_manager': '#6366f1',
  'pension_fund': '#8b5cf6',
  'insurance': '#a855f7',
  'fund_of_funds': '#d946ef',
  
  // Unknown (gray)
  'unknown': '#475569',
}

/**
 * Get the display label for an entity type
 */
export const getEntityTypeLabel = (type: string): string => {
  return ENTITY_TYPE_LABELS[type] || type
}

/**
 * Get the color for an entity type
 */
export const getEntityTypeColor = (type: string): string => {
  return ENTITY_TYPE_COLORS[type] || '#6b7280'
}

/**
 * Confidence levels for entity matching
 */
export const CONFIDENCE_LEVELS = {
  IDENTIFIED: 100,      // Decision maker found
  HIGH: 90,             // Very likely match
  MEDIUM: 70,           // Probable match
  LOW: 50,              // Possible match
  UNMATCHED: 0,         // No match / needs disclosure
}

/**
 * Backend entity type to frontend mapping
 * Used when receiving data from the API
 */
export const BACKEND_TO_FRONTEND_TYPE: Record<string, EntityType> = {
  'csd': 'csd',
  'global_custodian': 'global_custodian',
  'local_custodian': 'local_custodian',
  'dedicated_nominee': 'dedicated_nominee',
  'pooled_nominee': 'pooled_nominee',
  'wealth_manager': 'wealth_manager',
  'platform': 'platform',
  'private_bank': 'private_bank',
  'asset_manager': 'asset_manager',
  'pension_fund': 'pension_fund',
  'insurance': 'insurance',
  'fund_of_funds': 'fund_of_funds',
  'market_maker': 'market_maker',
  'unknown': 'unknown',
}

/**
 * Display labels that indicate terminal (decision maker) entities
 * Used when checking entity type by display label instead of code
 */
export const TERMINAL_DISPLAY_LABELS: string[] = [
  'Wealth Manager',
  'Private Bank',
  'Asset Manager',
  'Execution Platform',
  'Pension Fund',
  'Family Office',
  'Institution',
  'Insurance Company',
  'Fund of Funds',
]

/**
 * Check if a display label represents a terminal entity
 */
export const isTerminalDisplayLabel = (label: string): boolean => {
  return TERMINAL_DISPLAY_LABELS.includes(label)
}

