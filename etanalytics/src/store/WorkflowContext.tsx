/**
 * Workflow Context for Analysis Dashboard
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { WorkflowState, WorkflowContextType } from '../types/analysis'

const WORKFLOWS_STORAGE_KEY = 'etanalytics_workflows'

// Create context
export const WorkflowContext = createContext<WorkflowContextType | null>(null)

// Hook to use workflow context
export const useWorkflow = () => {
  const context = useContext(WorkflowContext)
  if (!context) throw new Error('useWorkflow must be used within WorkflowProvider')
  return context
}

interface WorkflowProviderProps {
  children: ReactNode
}

export const WorkflowProvider = ({ children }: WorkflowProviderProps) => {
  const [workflows, setWorkflows] = useState<Record<string, WorkflowState>>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(WORKFLOWS_STORAGE_KEY)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to parse workflows from storage:', e)
        }
      }
    }
    return {}
  })
  
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null)

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(workflows))
    }
  }, [workflows])

  const updateWorkflow = (id: string, state: Partial<WorkflowState>) => {
    setWorkflows(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { registerId: id, phase: 'idle', progress: 0, matchedCount: 0, totalCount: 0, identifiedPct: 0 }),
        ...state
      }
    }))
  }

  return (
    <WorkflowContext.Provider value={{ workflows, updateWorkflow, activeWorkflowId, setActiveWorkflowId }}>
      {children}
    </WorkflowContext.Provider>
  )
}



