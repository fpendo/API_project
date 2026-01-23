import React, { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  Plus, 
  GitBranch, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Building2,
  Users,
  Landmark,
  Briefcase,
  PiggyBank,
  TrendingUp
} from 'lucide-react'

// Get entity type color and gradient
const getEntityColors = (type: string): { bg: string; border: string; glow: string; icon: React.ReactNode } => {
  if (type.includes('CSD') || type.includes('Nominee')) {
    return {
      bg: 'from-blue-900/50 to-blue-800/30',
      border: 'border-blue-500/50',
      glow: 'shadow-blue-500/20',
      icon: <Landmark className="w-4 h-4" />
    }
  }
  if (type.includes('Global')) {
    return {
      bg: 'from-purple-900/50 to-purple-800/30',
      border: 'border-purple-500/50',
      glow: 'shadow-purple-500/20',
      icon: <Building2 className="w-4 h-4" />
    }
  }
  if (type.includes('Regional') || type.includes('Local')) {
    return {
      bg: 'from-teal-900/50 to-teal-800/30',
      border: 'border-teal-500/50',
      glow: 'shadow-teal-500/20',
      icon: <Building2 className="w-4 h-4" />
    }
  }
  if (type.includes('Wealth')) {
    return {
      bg: 'from-green-900/50 to-green-800/30',
      border: 'border-green-500/50',
      glow: 'shadow-green-500/20',
      icon: <PiggyBank className="w-4 h-4" />
    }
  }
  if (type.includes('Asset')) {
    return {
      bg: 'from-orange-900/50 to-orange-800/30',
      border: 'border-orange-500/50',
      glow: 'shadow-orange-500/20',
      icon: <TrendingUp className="w-4 h-4" />
    }
  }
  if (type.includes('Private')) {
    return {
      bg: 'from-cyan-900/50 to-cyan-800/30',
      border: 'border-cyan-500/50',
      glow: 'shadow-cyan-500/20',
      icon: <Briefcase className="w-4 h-4" />
    }
  }
  if (type.includes('Execution')) {
    return {
      bg: 'from-pink-900/50 to-pink-800/30',
      border: 'border-pink-500/50',
      glow: 'shadow-pink-500/20',
      icon: <Users className="w-4 h-4" />
    }
  }
  if (type.includes('Pension') || type.includes('Insurance')) {
    return {
      bg: 'from-indigo-900/50 to-indigo-800/30',
      border: 'border-indigo-500/50',
      glow: 'shadow-indigo-500/20',
      icon: <PiggyBank className="w-4 h-4" />
    }
  }
  if (type.includes('Family') || type.includes('Institution')) {
    return {
      bg: 'from-amber-900/50 to-amber-800/30',
      border: 'border-amber-500/50',
      glow: 'shadow-amber-500/20',
      icon: <Briefcase className="w-4 h-4" />
    }
  }
  return {
    bg: 'from-gray-800/50 to-gray-700/30',
    border: 'border-gray-500/50',
    glow: 'shadow-gray-500/20',
    icon: <Building2 className="w-4 h-4" />
  }
}

// Format shares for display
const formatShares = (shares: number): string => {
  if (shares >= 1e9) return `${(shares / 1e9).toFixed(1)}B`
  if (shares >= 1e6) return `${(shares / 1e6).toFixed(1)}M`
  if (shares >= 1e3) return `${(shares / 1e3).toFixed(0)}K`
  return shares.toString()
}

export const CustodyTreeNode = memo(({ data, selected }: NodeProps) => {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  
  const colors = getEntityColors(data.type)
  const totalShares: number = Number(data.totalShares) || 0
  const isRoot = data.level === 0
  
  // Calculate allocation percentage
  const remainingTotal: number = Object.values(data.remainingShares || {}).reduce((sum: number, v: any) => sum + Number(v), 0)
  const allocatedPct = totalShares > 0 ? ((totalShares - remainingTotal) / totalShares) * 100 : 0

  return (
    <>
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="tree-handle"
        style={{ background: 'transparent', border: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="tree-handle"
        style={{ background: 'transparent', border: 'none' }}
      />

      {/* Node card */}
      <motion.div
        className={`
          custody-node relative w-[280px] rounded-xl border-2 backdrop-blur-sm
          bg-gradient-to-br ${colors.bg} ${colors.border}
          ${data.isTerminal ? 'ring-2 ring-green-500/50 ring-offset-2 ring-offset-[#0a0e1a]' : ''}
          ${selected ? 'ring-2 ring-blue-400/50' : ''}
          ${hovered ? `shadow-xl ${colors.glow}` : 'shadow-lg shadow-black/50'}
          transition-all duration-300
        `}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          y: hovered ? -4 : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Level badge */}
        <div className={`
          absolute -top-3 -left-3 w-8 h-8 rounded-full 
          flex items-center justify-center text-xs font-bold
          ${isRoot ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}
          border-2 border-[#0a0e1a] shadow-lg
        `}>
          L{data.level}
        </div>

        {/* Terminal indicator */}
        {data.isTerminal && (
          <motion.div
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <CheckCircle className="w-5 h-5 text-white" />
          </motion.div>
        )}

        {/* Card content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              bg-white/10 text-white/80
            `}>
              {colors.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate" title={data.name}>
                {data.name}
              </h3>
              <p className="text-xs text-gray-400">{data.type}</p>
            </div>
          </div>

          {/* Shares summary */}
          <div className="flex items-center justify-between mb-3 py-2 px-3 rounded-lg bg-black/20">
            <div>
              <div className="text-lg font-bold text-white">{formatShares(totalShares)}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Shares</div>
            </div>
            
            {/* Allocation ring */}
            {!data.isTerminal && data.children?.length > 0 && (
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="4"
                  />
                  <motion.circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke={allocatedPct >= 99 ? '#10b981' : allocatedPct > 0 ? '#f59e0b' : 'rgba(255,255,255,0.2)'}
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 126' }}
                    animate={{ strokeDasharray: `${allocatedPct * 1.26} 126` }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{Math.round(allocatedPct)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* ETF Holdings - Compact view */}
          <div className="space-y-1 mb-3">
            {data.etfProducts?.slice(0, expanded ? undefined : 2).map((etf: any) => {
              const shares = data.holdings?.[etf.isin] || 0
              if (shares === 0) return null
              const pct = etf.totalShares > 0 ? (shares / etf.totalShares) * 100 : 0
              return (
                <div
                  key={etf.isin}
                  className="px-2 py-1.5 rounded-lg bg-white/5 text-[10px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-blue-400 font-mono truncate">{etf.isin}</span>
                    <span className="text-white font-bold">{formatShares(shares)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-gray-500 truncate max-w-[150px]" title={etf.name}>
                      {etf.name.length > 25 ? etf.name.slice(0, 25) + '...' : etf.name}
                    </span>
                    <span className="text-gray-400">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              )
            })}
            {!expanded && data.etfProducts?.filter((etf: any) => (data.holdings?.[etf.isin] || 0) > 0).length > 2 && (
              <button
                onClick={() => setExpanded(true)}
                className="w-full py-1 rounded-lg bg-white/5 text-[10px] text-gray-400 hover:bg-white/10"
              >
                +{data.etfProducts.filter((etf: any) => (data.holdings?.[etf.isin] || 0) > 0).length - 2} more ETFs
              </button>
            )}
          </div>

          {/* Expand/collapse toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" /> Less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> Details
              </>
            )}
          </button>

          {/* Expanded details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  {/* Full ETF breakdown with ISIN, name, and shares */}
                  {data.etfProducts?.map((etf: any) => {
                    const shares = data.holdings?.[etf.isin] || 0
                    const remaining = data.remainingShares?.[etf.isin] || 0
                    const allocated = shares - remaining
                    const pct = shares > 0 ? (allocated / shares) * 100 : 0
                    const globalPct = etf.totalShares > 0 ? (shares / etf.totalShares) * 100 : 0
                    
                    if (shares === 0) return null
                    
                    return (
                      <div key={etf.isin} className="p-2 rounded-lg bg-black/20 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-blue-400 font-mono">{etf.isin}</span>
                          <span className="text-xs text-white font-bold">{formatShares(shares)}</span>
                        </div>
                        <div className="text-[9px] text-gray-400 truncate" title={etf.name}>
                          {etf.name}
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-gray-500">{globalPct.toFixed(1)}% of total</span>
                          {!data.isTerminal && (
                            <span className="text-gray-500">{pct.toFixed(0)}% allocated</span>
                          )}
                        </div>
                        {!data.isTerminal && (
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                              className={`h-full ${pct >= 99 ? 'bg-green-500' : pct > 0 ? 'bg-yellow-500' : 'bg-gray-600'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons - visible on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900/95 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10 shadow-xl"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Add Child - show if node is not terminal */}
              {data.onAddChild && !data.isTerminal && (
                <motion.button
                  onClick={(e) => { e.stopPropagation(); data.onAddChild() }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 text-white text-xs font-medium shadow-lg hover:bg-blue-600 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Add a child entity (next level down)"
                >
                  <Plus className="w-3 h-3" />
                  Child
                </motion.button>
              )}

              {/* Add Sibling - show if parent has remaining shares (even for terminal nodes) */}
              {data.onAddSibling && (
                <motion.button
                  onClick={(e) => { e.stopPropagation(); data.onAddSibling() }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500 text-white text-xs font-medium shadow-lg hover:bg-purple-600 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Add another entity at the same level"
                >
                  <GitBranch className="w-3 h-3" />
                  Sibling
                </motion.button>
              )}

              {/* Mark Terminal - only show if not already terminal and has no children */}
              {!data.isTerminal && (!data.children || data.children.length === 0) && (
                <motion.button
                  onClick={(e) => { 
                    e.stopPropagation()
                    if (data.onMarkTerminal) data.onMarkTerminal()
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 text-white text-xs font-medium shadow-lg hover:bg-green-600 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Mark as investment decision maker (final level)"
                >
                  <CheckCircle className="w-3 h-3" />
                  Complete
                </motion.button>
              )}

              {/* Delete - always show for non-root nodes */}
              {data.onDelete && (
                <motion.button
                  onClick={(e) => { e.stopPropagation(); data.onDelete() }}
                  className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-red-500/80 text-white text-xs font-medium shadow-lg hover:bg-red-600 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Delete this entity"
                >
                  <Trash2 className="w-3 h-3" />
                </motion.button>
              )}

              {/* Info for terminal nodes */}
              {data.isTerminal && (
                <div className="flex items-center gap-1.5 px-3 py-2 text-green-400 text-xs">
                  <CheckCircle className="w-3 h-3" />
                  Decision Maker
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
})

CustodyTreeNode.displayName = 'CustodyTreeNode'

