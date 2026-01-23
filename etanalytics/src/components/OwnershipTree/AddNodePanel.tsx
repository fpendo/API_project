import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Search, 
  Plus, 
  CheckCircle, 
  Building2,
  ChevronRight,
  Sparkles,
  PlusCircle,
  Save
} from 'lucide-react'

interface ETFProduct {
  isin: string
  name: string
  totalShares: number
}

interface KnownEntity {
  id: string
  name: string
  type: string
  lei?: string
  fcaRef?: string
  aumBand?: string
}

interface AddNodePanelProps {
  mode: 'child' | 'sibling'
  availableShares: Record<string, number>
  etfProducts: ETFProduct[]
  knownEntities: Array<KnownEntity>
  onSubmit: (data: {
    name: string
    type: string
    holdings: Record<string, number>
    isTerminal: boolean
  }) => void
  onClose: () => void
  onCreateEntity?: (entity: KnownEntity) => void  // Callback to add new entity to database
}

// Entity type options with colors
const entityTypes = [
  { value: 'CSD', label: 'CSD', color: 'bg-blue-500' },
  { value: 'Global Custodian', label: 'Global Custodian', color: 'bg-purple-500' },
  { value: 'Regional Custodian', label: 'Regional Custodian', color: 'bg-teal-500' },
  { value: 'Local Custodian', label: 'Local Custodian', color: 'bg-teal-400' },
  { value: 'Clearing Broker', label: 'Clearing Broker', color: 'bg-indigo-500' },
  { value: 'Wealth Manager', label: 'Wealth Manager', color: 'bg-green-500' },
  { value: 'Private Bank', label: 'Private Bank', color: 'bg-cyan-500' },
  { value: 'Asset Manager', label: 'Asset Manager', color: 'bg-orange-500' },
  { value: 'Execution Platform', label: 'Execution Platform', color: 'bg-pink-500' },
  { value: 'Pension Fund', label: 'Pension Fund', color: 'bg-indigo-400' },
  { value: 'Family Office', label: 'Family Office', color: 'bg-amber-500' },
  { value: 'Institution', label: 'Institution', color: 'bg-gray-500' },
]

// Format shares for display
const formatShares = (shares: number): string => {
  if (shares >= 1e9) return `${(shares / 1e9).toFixed(2)}B`
  if (shares >= 1e6) return `${(shares / 1e6).toFixed(2)}M`
  if (shares >= 1e3) return `${(shares / 1e3).toFixed(0)}K`
  return shares.toString()
}

export const AddNodePanel: React.FC<AddNodePanelProps> = ({
  mode,
  availableShares,
  etfProducts,
  knownEntities,
  onSubmit,
  onClose,
  onCreateEntity,
}) => {
  const [name, setName] = useState('')
  const [type, setType] = useState('Global Custodian')
  const [holdings, setHoldings] = useState<Record<string, number>>({})
  const [isTerminal, setIsTerminal] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  
  // Create entity modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newEntityName, setNewEntityName] = useState('')
  const [newEntityType, setNewEntityType] = useState('Global Custodian')
  const [newEntityLei, setNewEntityLei] = useState('')
  const [newEntityFcaRef, setNewEntityFcaRef] = useState('')
  const [newEntityAum, setNewEntityAum] = useState('')

  // Filter entities based on search
  const filteredEntities = useMemo(() => {
    if (!name.trim()) return []
    return knownEntities
      .filter(e => e.name.toLowerCase().includes(name.toLowerCase()))
      .slice(0, 5)
  }, [name, knownEntities])

  // Calculate total allocated
  const totalAllocated = Object.values(holdings).reduce((sum, v) => sum + v, 0)
  const totalAvailable = Object.values(availableShares).reduce((sum, v) => sum + v, 0)
  
  // Validation
  const isValid = name.trim().length >= 2 && totalAllocated > 0

  // Quick allocation helpers
  const allocateAll = () => {
    setHoldings({ ...availableShares })
  }

  const allocateHalf = () => {
    const halfHoldings: Record<string, number> = {}
    Object.keys(availableShares).forEach(isin => {
      halfHoldings[isin] = Math.floor((availableShares[isin] || 0) / 2)
    })
    setHoldings(halfHoldings)
  }

  const clearAllocation = () => {
    setHoldings({})
  }

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({ name: name.trim(), type, holdings, isTerminal })
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-[480px] bg-[#0f1218] border-l border-white/10 z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Add {mode === 'child' ? 'Child' : 'Sibling'} Entity
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {mode === 'child' 
                  ? 'Add next level in custody chain' 
                  : 'Add another entity at same level'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Entity Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Entity Name
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder="Search or enter new entity..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
              
              {/* Search suggestions */}
              {searchFocused && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#1a1f2e] border border-white/10 rounded-lg overflow-hidden shadow-xl z-10"
                >
                  {filteredEntities.length > 0 ? (
                    <>
                      {filteredEntities.map((entity) => (
                        <button
                          key={entity.id}
                          onClick={() => {
                            setName(entity.name)
                            setType(entity.type)
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3"
                        >
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-sm text-white">{entity.name}</div>
                            <div className="text-xs text-gray-500">{entity.type}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-600 ml-auto" />
                        </button>
                      ))}
                      {/* Create new entity option */}
                      <button
                        onClick={() => {
                          setNewEntityName(name)
                          setShowCreateModal(true)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-green-500/10 transition-colors flex items-center gap-3 border-t border-white/5"
                      >
                        <PlusCircle className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-sm text-green-400">Create "{name}"</div>
                          <div className="text-xs text-gray-500">Add new entity to database</div>
                        </div>
                      </button>
                    </>
                  ) : name.trim().length >= 2 ? (
                    <>
                      <div className="px-4 py-3 text-sm text-gray-400">
                        No entities found for "{name}"
                      </div>
                      {/* Create new entity option */}
                      <button
                        onClick={() => {
                          setNewEntityName(name)
                          setShowCreateModal(true)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-green-500/10 transition-colors flex items-center gap-3 border-t border-white/5"
                      >
                        <PlusCircle className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-sm text-green-400">Create "{name}"</div>
                          <div className="text-xs text-gray-500">Add new entity to database</div>
                        </div>
                      </button>
                    </>
                  ) : null}
                </motion.div>
              )}
            </div>
            {name.trim().length > 0 && name.trim().length < 2 && (
              <p className="mt-1 text-xs text-red-400">Name must be at least 2 characters</p>
            )}
          </div>

          {/* Entity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Entity Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {entityTypes.map((et) => (
                <button
                  key={et.value}
                  onClick={() => setType(et.value)}
                  className={`
                    px-3 py-2 rounded-lg text-xs font-medium transition-all
                    flex items-center gap-2
                    ${type === et.value 
                      ? `${et.color} text-white shadow-lg` 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'}
                  `}
                >
                  <div className={`w-2 h-2 rounded-full ${et.color}`} />
                  {et.label}
                </button>
              ))}
            </div>
          </div>

          {/* Share Allocation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">
                Share Allocation
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={allocateAll}
                  className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                >
                  100%
                </button>
                <button
                  onClick={allocateHalf}
                  className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                >
                  50%
                </button>
                <button
                  onClick={clearAllocation}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-400 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* ETF allocation inputs */}
            <div className="space-y-3">
              {etfProducts.map((etf) => {
                const available = availableShares[etf.isin] || 0
                const allocated = holdings[etf.isin] || 0
                const hasAvailable = available > 1000
                const pct = available > 0 ? (allocated / available) * 100 : 0

                return (
                  <div
                    key={etf.isin}
                    className={`p-3 rounded-lg transition-all ${
                      hasAvailable ? 'bg-white/5' : 'bg-white/[0.02] opacity-50'
                    }`}
                  >
                    {/* ISIN - Full display */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-blue-400">{etf.isin}</span>
                      <div className="text-xs text-gray-500">
                        Avail: <span className="text-white font-medium">{formatShares(available)}</span>
                      </div>
                    </div>
                    
                    {/* ETF Name - Full display */}
                    <div className="text-xs text-gray-400 mb-2 truncate" title={etf.name}>
                      {etf.name}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        disabled={!hasAvailable}
                        value={allocated ? (allocated / 1e6).toFixed(2) : ''}
                        onChange={(e) => {
                          const val = Math.min(parseFloat(e.target.value) || 0, available / 1e6)
                          setHoldings(prev => ({
                            ...prev,
                            [etf.isin]: val * 1e6
                          }))
                        }}
                        placeholder="0"
                        className="w-24 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white text-center disabled:opacity-30 focus:border-blue-500 outline-none"
                      />
                      <span className="text-xs text-gray-500">M</span>
                      
                      {/* Progress bar */}
                      <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${pct >= 99 ? 'bg-green-500' : 'bg-blue-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(pct, 100)}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      
                      {/* Use all button */}
                      {hasAvailable && (
                        <button
                          onClick={() => {
                            setHoldings(prev => ({
                              ...prev,
                              [etf.isin]: available
                            }))
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Max
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Allocation summary */}
            <div className="mt-4 p-3 rounded-lg bg-black/30 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Total Allocated</span>
                <span className="text-lg font-bold text-white">{formatShares(totalAllocated)}</span>
              </div>
              <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${totalAllocated > totalAvailable ? 'bg-red-500' : 'bg-blue-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totalAllocated / totalAvailable) * 100, 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500 text-right">
                of {formatShares(totalAvailable)} available
              </div>
            </div>
          </div>

          {/* Mark as Terminal */}
          <div 
            onClick={() => setIsTerminal(!isTerminal)}
            className={`
              p-4 rounded-lg border-2 cursor-pointer transition-all
              ${isTerminal 
                ? 'bg-green-500/10 border-green-500/50' 
                : 'bg-white/5 border-transparent hover:border-white/10'}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                ${isTerminal ? 'bg-green-500 border-green-500' : 'border-gray-500'}
              `}>
                {isTerminal && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
              <div>
                <div className="text-sm font-medium text-white">Investment Decision Maker</div>
                <div className="text-xs text-gray-400">
                  Mark this entity as the final level - no further custody chain needed
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 space-y-3">
          {/* Validation message */}
          {!isValid && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-400">
                {name.trim().length < 2 
                  ? 'Enter entity name (min 2 characters)'
                  : 'Allocate shares to at least one ETF'}
              </p>
            </div>
          )}

          {/* Preview */}
          {isValid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30"
            >
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <Sparkles className="w-4 h-4" />
                Ready to add: <span className="text-white font-medium">{name}</span>
                <span className="text-gray-500">({type})</span>
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className="flex-1 py-3 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add {mode === 'child' ? 'Child' : 'Sibling'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>

      {/* Create Entity Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            {/* Modal backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[60]"
              onClick={() => setShowCreateModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl z-[70]"
            >
              {/* Modal header */}
              <div className="p-5 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <PlusCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Create New Entity</h3>
                      <p className="text-sm text-gray-400">Add to entity database</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal content */}
              <div className="p-5 space-y-4">
                {/* Entity Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Entity Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEntityName}
                    onChange={(e) => setNewEntityName(e.target.value)}
                    placeholder="e.g., State Street Bank & Trust"
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-green-500 outline-none transition-colors"
                  />
                </div>

                {/* Entity Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Entity Type <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {entityTypes.map((et) => (
                      <button
                        key={et.value}
                        onClick={() => setNewEntityType(et.value)}
                        className={`
                          px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${newEntityType === et.value 
                            ? `${et.color} text-white shadow-lg` 
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'}
                        `}
                      >
                        {et.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* LEI */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    LEI Code <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newEntityLei}
                    onChange={(e) => setNewEntityLei(e.target.value)}
                    placeholder="e.g., 549300QLSZ86UFDGPO05"
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-green-500 outline-none font-mono text-sm transition-colors"
                  />
                </div>

                {/* FCA Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    FCA Reference <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newEntityFcaRef}
                    onChange={(e) => setNewEntityFcaRef(e.target.value)}
                    placeholder="e.g., 123456"
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-green-500 outline-none font-mono text-sm transition-colors"
                  />
                </div>

                {/* AUM Band */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    AUM Band <span className="text-gray-500">(optional)</span>
                  </label>
                  <select
                    value={newEntityAum}
                    onChange={(e) => setNewEntityAum(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:border-green-500 outline-none transition-colors"
                  >
                    <option value="">Select AUM band...</option>
                    <option value="<1B">&lt;€1B</option>
                    <option value="1-10B">€1B - €10B</option>
                    <option value="10-50B">€10B - €50B</option>
                    <option value="50-100B">€50B - €100B</option>
                    <option value="100-500B">€100B - €500B</option>
                    <option value=">500B">&gt;€500B</option>
                  </select>
                </div>
              </div>

              {/* Modal footer */}
              <div className="p-5 border-t border-white/10 flex items-center gap-3">
                <button
                  onClick={() => {
                    if (newEntityName.trim().length < 2) {
                      alert('Entity name must be at least 2 characters')
                      return
                    }
                    
                    // Create the new entity
                    const newEntity: KnownEntity = {
                      id: `entity-${Date.now()}`,
                      name: newEntityName.trim(),
                      type: newEntityType,
                      lei: newEntityLei || undefined,
                      fcaRef: newEntityFcaRef || undefined,
                      aumBand: newEntityAum || undefined,
                    }
                    
                    // Callback to add to database
                    if (onCreateEntity) {
                      onCreateEntity(newEntity)
                    }
                    
                    // Use this entity for the current operation
                    setName(newEntity.name)
                    setType(newEntity.type)
                    
                    // Close modal and reset
                    setShowCreateModal(false)
                    setNewEntityName('')
                    setNewEntityLei('')
                    setNewEntityFcaRef('')
                    setNewEntityAum('')
                  }}
                  disabled={newEntityName.trim().length < 2}
                  className="flex-1 py-3 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create & Use Entity
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default AddNodePanel

