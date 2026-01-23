import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'

// Activity types across the application
export type ActivityType = 
  | 'upload' 
  | 'analysis_started' 
  | 'matching_complete'
  | 'analysis_complete' 
  | 'report_delivered' 
  | 'report_viewed' 
  | 'disclosure_response' 
  | 'large_position_change'
  | 'entity_added'
  | 'export_downloaded'

export interface Activity {
  id: string
  issuerId: string
  type: ActivityType
  message: string
  timestamp: string
  status: 'success' | 'info' | 'warning' | 'error'
  metadata?: {
    registerId?: string
    reportId?: string
    etfIsin?: string
    entityName?: string
    identifiedPct?: number
    changeAmount?: string
  }
  read?: boolean
}

interface ActivityContextType {
  activities: Activity[]
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void
  getActivitiesForIssuer: (issuerId: string, limit?: number) => Activity[]
  getUnreadCount: (issuerId: string) => number
  markAsRead: (activityId: string) => void
  markAllAsRead: (issuerId: string) => void
  clearActivities: (issuerId: string) => void
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined)

const STORAGE_KEY = 'etanalytics_activities'

// Generate sample activities for demo
const generateSampleActivities = (): Activity[] => {
  const now = new Date()
  const activities: Activity[] = []
  
  // Amundi activities
  const amundiActivities: Omit<Activity, 'id'>[] = [
    {
      issuerId: 'amundi',
      type: 'report_delivered',
      message: 'Q4 2025 Analysis Report delivered',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      metadata: { reportId: 'report-001', identifiedPct: 71.2 }
    },
    {
      issuerId: 'amundi',
      type: 'matching_complete',
      message: 'Entity matching completed - 68% identified',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      metadata: { identifiedPct: 68 }
    },
    {
      issuerId: 'amundi',
      type: 'analysis_started',
      message: 'Analysis started for Q4 2025 register',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      status: 'info',
      metadata: { registerId: 'reg-001' }
    },
    {
      issuerId: 'amundi',
      type: 'upload',
      message: 'Share register uploaded (42 ETFs, 128 nominees)',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      metadata: { registerId: 'reg-001' }
    },
    {
      issuerId: 'amundi',
      type: 'disclosure_response',
      message: 'Disclosure response received from Euroclear',
      timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      status: 'info',
      metadata: { entityName: 'Euroclear Bank SA/NV' }
    },
    {
      issuerId: 'amundi',
      type: 'large_position_change',
      message: 'Large position change: Hargreaves Lansdown +€280M',
      timestamp: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
      status: 'warning',
      metadata: { entityName: 'Hargreaves Lansdown', changeAmount: '+€280M' }
    },
    {
      issuerId: 'amundi',
      type: 'report_delivered',
      message: 'Q3 2025 Analysis Report delivered',
      timestamp: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      metadata: { reportId: 'report-002', identifiedPct: 65.8 }
    },
    {
      issuerId: 'amundi',
      type: 'report_delivered',
      message: 'Q2 2025 Analysis Report delivered',
      timestamp: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      metadata: { reportId: 'report-003', identifiedPct: 62.1 }
    },
  ]
  
  // BlackRock activities
  const blackrockActivities: Omit<Activity, 'id'>[] = [
    {
      issuerId: 'blackrock',
      type: 'upload',
      message: 'Share register uploaded (156 ETFs, 245 nominees)',
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      metadata: { registerId: 'reg-br-001' }
    },
    {
      issuerId: 'blackrock',
      type: 'large_position_change',
      message: 'Large position change: St. James\'s Place +€450M',
      timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      status: 'warning',
      metadata: { entityName: 'St. James\'s Place', changeAmount: '+€450M' }
    },
  ]
  
  // Vanguard activities
  const vanguardActivities: Omit<Activity, 'id'>[] = [
    {
      issuerId: 'vanguard',
      type: 'analysis_started',
      message: 'Analysis started for January 2026 register',
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      status: 'info',
      metadata: { registerId: 'reg-vg-001' }
    },
    {
      issuerId: 'vanguard',
      type: 'report_delivered',
      message: 'Q4 2025 Analysis Report delivered',
      timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      metadata: { reportId: 'report-vg-001', identifiedPct: 74.5 }
    },
  ]
  
  // Combine and add IDs
  const allActivities = [...amundiActivities, ...blackrockActivities, ...vanguardActivities]
  allActivities.forEach((activity, index) => {
    activities.push({
      ...activity,
      id: `activity-${index}-${Date.now()}`,
      read: false
    })
  })
  
  return activities
}

export const ActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) return parsed
      }
    } catch (e) {
      console.error('Failed to load activities:', e)
    }
    return generateSampleActivities()
  })

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities))
    } catch (e) {
      console.error('Failed to save activities:', e)
    }
  }, [activities])

  const addActivity = (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    const newActivity: Activity = {
      ...activity,
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false
    }
    setActivities(prev => [newActivity, ...prev])
  }

  const getActivitiesForIssuer = (issuerId: string, limit?: number): Activity[] => {
    const filtered = activities
      .filter(a => a.issuerId === issuerId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return limit ? filtered.slice(0, limit) : filtered
  }

  const getUnreadCount = (issuerId: string): number => {
    return activities.filter(a => a.issuerId === issuerId && !a.read).length
  }

  const markAsRead = (activityId: string) => {
    setActivities(prev => 
      prev.map(a => a.id === activityId ? { ...a, read: true } : a)
    )
  }

  const markAllAsRead = (issuerId: string) => {
    setActivities(prev =>
      prev.map(a => a.issuerId === issuerId ? { ...a, read: true } : a)
    )
  }

  const clearActivities = (issuerId: string) => {
    setActivities(prev => prev.filter(a => a.issuerId !== issuerId))
  }

  return (
    <ActivityContext.Provider value={{
      activities,
      addActivity,
      getActivitiesForIssuer,
      getUnreadCount,
      markAsRead,
      markAllAsRead,
      clearActivities
    }}>
      {children}
    </ActivityContext.Provider>
  )
}

export const useActivities = () => {
  const context = useContext(ActivityContext)
  if (!context) {
    throw new Error('useActivities must be used within an ActivityProvider')
  }
  return context
}

// Helper to format relative time
export const formatRelativeTime = (timestamp: string): string => {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Group activities by date
export const groupActivitiesByDate = (activities: Activity[]): Record<string, Activity[]> => {
  const groups: Record<string, Activity[]> = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  activities.forEach(activity => {
    const activityDate = new Date(activity.timestamp)
    let groupKey: string

    if (activityDate >= today) {
      groupKey = 'Today'
    } else if (activityDate >= yesterday) {
      groupKey = 'Yesterday'
    } else if (activityDate >= weekAgo) {
      groupKey = 'This Week'
    } else {
      groupKey = 'Earlier'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(activity)
  })

  return groups
}

