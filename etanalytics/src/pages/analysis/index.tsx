/**
 * Analysis Dashboard Module
 * Exports all analysis-related components
 */
export { default as AnalysisQueue } from './AnalysisQueue'
export { default as AnalystSettings } from './AnalystSettings'

// Re-export the main dashboard from legacy file
// TODO: Split remaining components (ClientsList, EntityDatabase, Workflows, etc.)
export { default as AnalysisDashboard } from '../AnalysisDashboard'



